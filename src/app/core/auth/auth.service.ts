import {inject, Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Router} from '@angular/router';
import {BehaviorSubject, Observable, throwError} from 'rxjs';
import {catchError, map, tap} from 'rxjs/operators';
import {EnvironmentService} from '../../shared/services/environment.service';
import {LocalStorageService} from '../../shared/services/local-storage.service';
import {UserService} from '../../shared/services/user.service';
import {AuthTokens, TokenResponse, User} from './auth.models';

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

  login(returnUrl?: string) {
    console.log('AuthService returnUrl', returnUrl);

    if (returnUrl) {
      this.storage.set(this.ORIGINAL_ROUTE_KEY, returnUrl);
    }
    const redirectUri = `${window.location.origin}/auth/callback`;
    window.location.href = `${this.API_URL}/auth/login?redirect_uri=${encodeURIComponent(redirectUri)}`;
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
    this.storage.remove(this.TOKEN_KEY);
    this.storage.remove(this.USER_KEY);
    this.storage.remove(this.ORIGINAL_ROUTE_KEY);
    this.isAuthenticatedSubject.next(false);
    this.userSubject.next(null);
    this.router.navigate(['/']);
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

  fetchUserInfo() {
    // Use UserService to get user session with licenses
    this.userService.getUserSession().subscribe({
      next: userSession => {
        const user: User = {
          id: userSession.uid,
          email: userSession.email,
          name: userSession.name,
          roles: userSession.roles,
          licenses: userSession.licenses
        };

        this.storage.set(this.USER_KEY, user);
        this.userSubject.next(user);
      },
      error: error => console.error('Failed to fetch user session:', error)
    });
  }

  getStoredTokens(): AuthTokens | null {
    return this.storage.get<AuthTokens>(this.TOKEN_KEY);
  }

  getStoredUser(): User | null {
    return this.storage.get<User>(this.USER_KEY);
  }
}
