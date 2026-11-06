import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService, LOGOUT_RETURN_PATH } from './auth.service';
import { safeReturnUrl } from './logout-return.guard';
import { authReducer, initialState } from './store/auth.reducer';
import * as AuthActions from './store/auth.actions';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { UserService } from '../../shared/services/user.service';

/**
 * Issue #115: logout used to clear the stored session before redirecting to
 * Keycloak. Keycloak asks for confirmation, so a user who backed out of that
 * screen ended up logged out in the client while still logged in at Keycloak.
 * The session must now be cleared only once Keycloak lands the user on the
 * post-logout route, and they must return to the exact page they left.
 */
describe('AuthService logout (issue #115)', () => {
  let stored: Map<string, unknown>;
  let originalUrl: string;

  beforeEach(() => {
    originalUrl = window.location.pathname + window.location.search + window.location.hash;
    stored = new Map<string, unknown>([
      ['auth_tokens', { accessToken: 'a', tokenType: 'Bearer', expiresAt: Date.now() + 60_000 }],
      ['auth_user', { id: 'u' }],
    ]);
  });

  afterEach(() => {
    window.history.replaceState(null, '', originalUrl);
  });

  function setup(): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Store, useValue: { dispatch: () => {} } },
        AuthService,
        { provide: ConfigService, useValue: { isLoginEnabled: () => true } },
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.example.org/' } },
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
    return TestBed.inject(AuthService);
  }

  function watchNavigation(service: AuthService): string[] {
    const navigatedTo: string[] = [];
    spyOn(service as any, 'navigateExternal').and.callFake((url: string) => navigatedTo.push(url));
    return navigatedTo;
  }

  it('keeps the stored session while Keycloak asks for confirmation', () => {
    window.history.replaceState(null, '', '/view/uuid:1?page=uuid:2');
    const service = setup();
    watchNavigation(service);

    service.logout();

    expect(stored.has('auth_tokens')).toBeTrue();
    expect(service.hasValidToken()).toBeTrue();
  });

  it('sends Keycloak back to the logout landing route carrying the exact current page', () => {
    window.history.replaceState(null, '', '/view/uuid:1?page=uuid:2#x');
    const service = setup();
    const navigatedTo = watchNavigation(service);

    service.logout();

    expect(navigatedTo.length).toBe(1);
    const backend = new URL(navigatedTo[0]);
    expect(backend.pathname.endsWith('/auth/logout')).toBeTrue();
    const redirect = new URL(backend.searchParams.get('redirect_uri')!);
    expect(redirect.origin).toBe(window.location.origin);
    expect(redirect.pathname).toBe(`/${LOGOUT_RETURN_PATH}`);
    expect(redirect.searchParams.get('returnUrl')).toBe('/view/uuid:1?page=uuid:2#x');
  });

  it('clears the stored session up front when the session is already dead', () => {
    const service = setup();
    watchNavigation(service);

    service.logout(true);

    expect(stored.has('auth_tokens')).toBeFalse();
    expect(stored.has('auth_user')).toBeFalse();
  });

  it('clears the stored session when the app boots on the logout landing route', () => {
    window.history.replaceState(null, '', `/${LOGOUT_RETURN_PATH}?returnUrl=%2Fview%2Fuuid%3A1`);

    const service = setup();

    expect(stored.has('auth_tokens')).toBeFalse();
    expect(stored.has('auth_user')).toBeFalse();
    expect(service.hasValidToken()).toBeFalse();
  });

  it('keeps the stored session when the app boots anywhere else', () => {
    window.history.replaceState(null, '', '/view/uuid:1');

    setup();

    expect(stored.has('auth_tokens')).toBeTrue();
  });
});

describe('safeReturnUrl', () => {
  it('passes through app paths with query and hash', () => {
    expect(safeReturnUrl('/view/uuid:1?page=uuid:2#x')).toBe('/view/uuid:1?page=uuid:2#x');
  });

  it('falls back to root for missing, external, protocol-relative or auth URLs', () => {
    expect(safeReturnUrl(null)).toBe('/');
    expect(safeReturnUrl('https://evil.example')).toBe('/');
    expect(safeReturnUrl('//evil.example')).toBe('/');
    expect(safeReturnUrl('/auth/logged-out?returnUrl=/')).toBe('/');
  });
});

describe('authReducer on logout (issue #115)', () => {
  it('keeps the user logged in while Keycloak asks for confirmation', () => {
    const loggedIn = {
      ...initialState,
      isAuthenticated: true,
      user: { id: 'u', email: 'e', name: 'n' },
    };

    const next = authReducer(loggedIn, AuthActions.logout());

    expect(next).toBe(loggedIn);
  });
});
