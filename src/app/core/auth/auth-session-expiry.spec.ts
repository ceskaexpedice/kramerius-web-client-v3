import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Action, Store } from '@ngrx/store';
import { AuthService } from './auth.service';
import * as AuthActions from './store/auth.actions';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { UserService } from '../../shared/services/user.service';

/**
 * The backend has no token refresh, so an expired access token must end the
 * session visibly instead of leaving the UI "logged in" while requests already
 * go out anonymously.
 */
describe('AuthService session expiry', () => {
  let stored: Map<string, unknown>;
  let dispatched: Action[];
  let clearUserDataCalls: number;

  function setup(tokens: unknown): AuthService {
    stored = new Map<string, unknown>([['auth_user', { id: 'u' }]]);
    if (tokens) stored.set('auth_tokens', tokens);
    dispatched = [];
    clearUserDataCalls = 0;

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Store, useValue: { dispatch: (a: Action) => dispatched.push(a) } },
        AuthService,
        { provide: ConfigService, useValue: { isLoginEnabled: () => true } },
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.example.org/user' } },
        {
          provide: LocalStorageService,
          useValue: {
            get: (k: string) => stored.get(k) ?? null,
            set: (k: string, v: unknown) => stored.set(k, v),
            remove: (k: string) => stored.delete(k),
          },
        },
        {
          provide: UserService,
          useValue: {
            loadUserData: () => Promise.resolve(),
            userSession: null,
            clearUserData: () => { clearUserDataCalls++; },
          },
        },
      ],
    });
    return TestBed.inject(AuthService);
  }

  function token(expiresInMs: number) {
    return { accessToken: 'a', tokenType: 'Bearer', expiresAt: Date.now() + expiresInMs };
  }

  it('drops a session that expired while the app was closed, before reporting a user', () => {
    const service = setup(token(-1_000));
    let user: unknown = 'unset';
    service.user$.subscribe(u => user = u).unsubscribe();

    expect(stored.has('auth_tokens')).toBeFalse();
    expect(user).toBeNull();
  });

  it('ends the session: clears storage, user data and dispatches sessionExpired', () => {
    const service = setup(token(60_000));
    let authenticated: boolean | undefined;
    service.isAuthenticated$.subscribe(v => authenticated = v);

    service.expireSession();

    expect(stored.has('auth_tokens')).toBeFalse();
    expect(stored.has('auth_user')).toBeFalse();
    expect(authenticated).toBeFalse();
    expect(clearUserDataCalls).toBe(1);
    expect(dispatched).toContain(AuthActions.sessionExpired());
  });

  it('does nothing when there is no session', () => {
    const service = setup(null);

    service.expireSession();

    expect(clearUserDataCalls).toBe(0);
    expect(dispatched.length).toBe(0);
  });

  it('ends the session by itself when the access token expires', fakeAsync(() => {
    setup(token(5_000));

    tick(4_000);
    expect(dispatched.length).toBe(0);

    tick(1_500);
    expect(dispatched).toContain(AuthActions.sessionExpired());
    expect(stored.has('auth_tokens')).toBeFalse();
  }));
});
