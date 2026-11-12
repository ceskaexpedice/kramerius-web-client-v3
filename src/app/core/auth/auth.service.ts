import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { EnvironmentService } from '../../shared/services/environment.service';
import { ConfigService } from '../config/config.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { UserService } from '../../shared/services/user.service';
import { Store } from '@ngrx/store';
import * as AuthActions from './store/auth.actions';
import { AuthTokens, TokenResponse, User } from './auth.models';

/** Where Keycloak lands the user after a confirmed logout (see `logoutReturnGuard`). */
export const LOGOUT_RETURN_PATH = 'auth/logged-out';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly TOKEN_KEY = 'auth_tokens';
  private readonly USER_KEY = 'auth_user';
  private readonly ORIGINAL_ROUTE_KEY = 'auth_original_route';

  private http = inject(HttpClient);
  private router = inject(Router);
  private storage = inject(LocalStorageService);
  private userService = inject(UserService);
  private store = inject(Store);
  private config = inject(ConfigService);

  // Must run before the auth subjects below read the stored session: when the
  // app boots on the post-logout landing route, the stored tokens are stale and
  // must be gone before anything (subjects, interceptor, user load) uses them.
  private readonly returnedFromLogout = this.completeLogoutIfReturning();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(
    private env: EnvironmentService
  ) {
    // Back from Keycloak's logout screen, the browser may restore this page
    // from the back/forward cache with its old in-memory state. If the stored
    // session changed meanwhile (e.g. it was cleared before a forced logout),
    // that snapshot is stale — reload so the UI matches the real session.
    window.addEventListener('pageshow', (event: PageTransitionEvent) => {
      if (event.persisted && this.isAuthenticatedSubject.value !== this.hasValidToken()) {
        window.location.reload();
      }
    });
  }

  private get API_URL(): string {
    const url = this.env.getApiUrl('user');
    if (!url) {
      console.warn('AuthService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  /**
   * Whether login is available at all in this deployment (`features.keycloak`).
   * Callers that render login affordances should check this before showing them;
   * `login()` itself also refuses when it is false, so a stray call from a guard
   * or a deep link can never navigate the user to Keycloak.
   */
  isLoginEnabled(): boolean {
    return this.config.isLoginEnabled();
  }

  /**
   * Single in-app entry point for every "log in" affordance. Routes through the
   * terms page so the licence/GDPR consent step is never bypassed; the terms page
   * then calls `login()` with the same `returnUrl`.
   *
   * @param returnUrl Where the user should land after logging in. Defaults to the
   *   current page; pass an explicit target when the user was heading somewhere
   *   else (e.g. "My library" → the saved lists).
   */
  startLogin(returnUrl: string = this.router.url) {
    if (!this.isLoginEnabled()) {
      console.warn('AuthService: login is disabled (features.keycloak is false).');
      return;
    }
    this.router.navigate(['pages/terms'], {
      queryParams: { returnUrl: this.unwrapTermsReturnUrl(returnUrl) },
    });
  }

  /**
   * When login is started from the terms page itself, its own `returnUrl` is the
   * real destination — don't nest `/pages/terms?returnUrl=/pages/terms?...`.
   */
  private unwrapTermsReturnUrl(url: string): string {
    const tree = this.router.parseUrl(url);
    const segments = tree.root.children['primary']?.segments.map(s => s.path) ?? [];
    const isTerms = segments.length >= 2
      && segments[segments.length - 2] === 'pages'
      && segments[segments.length - 1] === 'terms';
    return isTerms ? (tree.queryParams['returnUrl'] || '/') : url;
  }

  login(returnUrl?: string) {
    // features.keycloak off — there is no identity provider to send the user to.
    if (!this.isLoginEnabled()) {
      console.warn('AuthService: login is disabled (features.keycloak is false).');
      return;
    }

    console.log('AuthService returnUrl', returnUrl);

    if (returnUrl) {
      this.storage.set(this.ORIGINAL_ROUTE_KEY, returnUrl);
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    this.navigateExternal(`${this.API_URL}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  exchangeCodeForToken(code: string): Observable<AuthTokens> {
    const redirectUri = `${window.location.origin}/auth/callback`;

    return this.http.get<TokenResponse>(`${this.API_URL}/auth/token?code=${code}&redirect_uri=${redirectUri}`).pipe(
      map(response => this.mapTokenResponse(response)),
      tap(tokens => this.handleSuccessfulAuth(tokens)),
      catchError(error => {
        console.error('Token exchange failed:', error);
        return throwError(() => error);
      })
    );
  }

  refreshToken(): Observable<AuthTokens> {
    const tokens = this.getStoredTokens();
    if (!tokens?.refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    const params = new HttpParams()
      .set('refresh_token', tokens.refreshToken)
      .set('grant_type', 'refresh_token');

    return this.http.post<TokenResponse>(`${this.API_URL}/auth/token`, params).pipe(
      map(response => this.mapTokenResponse(response)),
      tap(newTokens => this.handleSuccessfulAuth(newTokens)),
      catchError(error => {
        // The refresh token is rejected — the session is dead either way.
        this.logout(true);
        return throwError(() => error);
      })
    );
  }

  /**
   * Ends the session via Keycloak.
   *
   * The local session is NOT cleared here (issue #115): Keycloak shows a
   * confirmation screen, and a user who backs out of it (Back, refresh, typing
   * the URL) is still logged in at Keycloak — so the client must still be too.
   * Keycloak redirects to `LOGOUT_RETURN_PATH` only after a confirmed logout;
   * that route clears the stored session (see `completeLogoutIfReturning`) and
   * forwards to `returnUrl`, i.e. exactly the page logout was clicked on.
   *
   * Keeping the in-memory state also avoids repainting every document with lock
   * icons before the browser leaves the page.
   *
   * @param clearLocalSession Clear the stored session before redirecting. Used
   *   when the session is already dead (failed token refresh): keeping the stale
   *   tokens would only bounce a user who cancels straight back into logout.
   */
  logout(clearLocalSession = false) {
    if (clearLocalSession) {
      this.clearStoredSession();
    }
    const returnUrl = window.location.pathname + window.location.search + window.location.hash;
    const redirectUri = `${window.location.origin}/${LOGOUT_RETURN_PATH}?returnUrl=${encodeURIComponent(returnUrl)}`;
    this.navigateExternal(`${this.API_URL}/auth/logout?redirect_uri=${encodeURIComponent(redirectUri)}`);
  }

  /**
   * Runs once at construction. If the app was loaded on the post-logout landing
   * route, Keycloak has confirmed the logout, so the stored session is cleared
   * before anything reads it. The route guard then forwards to `returnUrl`.
   */
  private completeLogoutIfReturning(): boolean {
    if (window.location.pathname !== `/${LOGOUT_RETURN_PATH}`) {
      return false;
    }
    this.clearStoredSession();
    return true;
  }

  private clearStoredSession(): void {
    this.storage.remove(this.TOKEN_KEY);
    this.storage.remove(this.USER_KEY);
    this.storage.remove(this.ORIGINAL_ROUTE_KEY);
  }

  /**
   * Full-page navigation to the backend auth endpoints. Extracted into a method
   * so specs can observe it — `window.location` cannot be redefined in current
   * Chrome, which makes assigning `href` unobservable from a test.
   */
  protected navigateExternal(url: string): void {
    window.location.href = url;
  }

  getAccessToken(): string | null {
    const tokens = this.getStoredTokens();
    return tokens?.accessToken || null;
  }

  isTokenExpired(): boolean {
    const tokens = this.getStoredTokens();
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }

  hasValidToken(): boolean {
    return !this.isTokenExpired();
  }

  getOriginalRoute(): string | null {
    return this.storage.get<string>(this.ORIGINAL_ROUTE_KEY);
  }

  clearOriginalRoute() {
    this.storage.remove(this.ORIGINAL_ROUTE_KEY);
  }

  private mapTokenResponse(response: TokenResponse): AuthTokens {
    console.log('response', response);
    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      tokenType: response.token_type,
      expiresAt: Date.now() + (response.expires_in * 1000)
    };
  }

  private handleSuccessfulAuth(tokens: AuthTokens) {
    this.storage.set(this.TOKEN_KEY, tokens);
    this.isAuthenticatedSubject.next(true);
    this.fetchUserInfo();
  }

  async fetchUserInfo() {
    try {
      // Load user data including licenses (this also clears cache if licenses changed)
      await this.userService.loadUserData();

      const userSession = this.userService.userSession;
      if (userSession) {
        const user: User = {
          id: userSession.uid,
          email: userSession.email,
          name: userSession.name,
          roles: userSession.roles,
          licenses: userSession.licenses,
          session: userSession.session
        };

        this.storage.set(this.USER_KEY, user);
        this.userSubject.next(user);

        // Update NgRx store with user data
        this.store.dispatch(AuthActions.setUser({ user }));

        // Reload to ensure all components display correct data based on new licenses
        setTimeout(() => {
          // window.location.reload();
        }, 50);
      }
    } catch (error) {
      console.error('Failed to fetch user session:', error);
    }
  }

  getStoredTokens(): AuthTokens | null {
    return this.storage.get<AuthTokens>(this.TOKEN_KEY);
  }

  getStoredUser(): User | null {
    return this.storage.get<User>(this.USER_KEY);
  }

  getRawUserSession(): any {
    return this.storage.get(this.USER_KEY) || null;
  }
}
