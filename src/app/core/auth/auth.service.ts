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

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(this.hasValidToken());
  private userSubject = new BehaviorSubject<User | null>(this.getStoredUser());

  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();
  public user$ = this.userSubject.asObservable();

  constructor(
    private env: EnvironmentService
  ) {
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
        this.logout();
        return throwError(() => error);
      })
    );
  }

  logout() {
    // Clear persisted storage. This does NOT trigger any UI re-render, so it's
    // safe to do before navigating away.
    this.storage.remove(this.TOKEN_KEY);
    this.storage.remove(this.USER_KEY);
    this.storage.remove(this.ORIGINAL_ROUTE_KEY);

    // Redirect to backend logout endpoint (which handles Keycloak logout and
    // redirects back to the current page) FIRST.
    //
    // We must NOT clear the in-memory user state (auth subjects, licenses,
    // HTTP cache) before this navigation: doing so synchronously invalidates
    // the license signals and lets Angular run a change-detection tick that
    // repaints every document with lock icons before the browser leaves the
    // page. The result is a jarring "everything locks up, then the Keycloak
    // logout screen appears" flash (issue #115).
    //
    // Because this is a full-page navigation, the in-memory state is discarded
    // anyway; when the user returns from Keycloak the app reloads fresh and the
    // locks re-render correctly at that point instead of before logout.
    const redirectUri = encodeURIComponent(window.location.href);
    this.navigateExternal(`${this.API_URL}/auth/logout?redirect_uri=${redirectUri}`);
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
