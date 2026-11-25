import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from './auth.service';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { UserService } from '../../shared/services/user.service';

/**
 * The backend answers a rejected authorization code (expired, already used)
 * with HTTP 200 and an OAuth error body. That must be treated as a failed
 * exchange, not stored as a session with an undefined token.
 */
describe('AuthService token exchange', () => {
  const API = 'https://api.example.org/user';
  let stored: Map<string, unknown>;

  function setup(): { service: AuthService; httpMock: HttpTestingController } {
    stored = new Map<string, unknown>();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Store, useValue: { dispatch: () => {} } },
        AuthService,
        { provide: ConfigService, useValue: { isLoginEnabled: () => true } },
        { provide: EnvironmentService, useValue: { getApiUrl: () => API } },
        {
          provide: LocalStorageService,
          useValue: {
            get: (k: string) => stored.get(k) ?? null,
            set: (k: string, v: unknown) => stored.set(k, v),
            remove: (k: string) => stored.delete(k),
          },
        },
        { provide: UserService, useValue: { loadUserData: () => Promise.resolve(), userSession: null } },
      ],
    });
    return { service: TestBed.inject(AuthService), httpMock: TestBed.inject(HttpTestingController) };
  }

  it('fails and stores nothing when the backend returns an OAuth error with HTTP 200', () => {
    const { service, httpMock } = setup();
    let failed = false;

    service.exchangeCodeForToken('used-code').subscribe({
      next: () => fail('expected the exchange to fail'),
      error: () => { failed = true; },
    });

    const req = httpMock.expectOne(r => r.url === `${API}/auth/token`);
    req.flush({ error: 'invalid_grant', error_description: 'Code not valid' });

    expect(failed).toBeTrue();
    expect(stored.has('auth_tokens')).toBeFalse();
    expect(service.hasValidToken()).toBeFalse();
    httpMock.verify();
  });

  it('sends the code and redirect_uri URL-encoded', () => {
    const { service, httpMock } = setup();

    service.exchangeCodeForToken('a+b&c').subscribe({ error: () => {} });

    const req = httpMock.expectOne(r => r.url === `${API}/auth/token`);
    expect(req.request.params.get('code')).toBe('a+b&c');
    expect(req.request.urlWithParams).toContain('code=a%2Bb%26c');
    req.flush({ error: 'invalid_grant' });
    httpMock.verify();
  });

  it('treats a stored token without an access token or a finite expiry as expired', () => {
    const { service } = setup();

    stored.set('auth_tokens', { accessToken: undefined, tokenType: 'Bearer', expiresAt: Date.now() + 60_000 });
    expect(service.isTokenExpired()).toBeTrue();

    stored.set('auth_tokens', { accessToken: 'a', tokenType: 'Bearer', expiresAt: null });
    expect(service.isTokenExpired()).toBeTrue();

    stored.set('auth_tokens', { accessToken: 'a', tokenType: 'Bearer', expiresAt: Date.now() + 60_000 });
    expect(service.isTokenExpired()).toBeFalse();
  });
});
