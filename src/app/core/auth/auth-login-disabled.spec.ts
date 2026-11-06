import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthService } from './auth.service';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { LocalStorageService } from '../../shared/services/local-storage.service';
import { UserService } from '../../shared/services/user.service';

/**
 * Regression test for `features.keycloak: false`. The flag existed in the config
 * schema and the docs ("uživatelský profil a oblíbené jsou skryté") but nothing
 * read it — every login entry point (user menu, favorites prompt, AI panel,
 * AuthGuard) still redirected to Keycloak. `login()` is the single chokepoint
 * all of them go through, so it must refuse when login is disabled.
 */
describe('AuthService with login disabled', () => {

  function setup(keycloak: boolean): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Store, useValue: { dispatch: () => {}, select: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) } },
        AuthService,
        { provide: ConfigService, useValue: { isLoginEnabled: () => keycloak } },
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.example.org/' } },
        { provide: LocalStorageService, useValue: { get: () => null, set: () => {}, remove: () => {} } },
        { provide: UserService, useValue: { loadUserData: () => Promise.resolve(), userSession: null } },
      ],
    });
    return TestBed.inject(AuthService);
  }

  /** Captures the full-page navigations `login()` would trigger. */
  function watchNavigation(service: AuthService): string[] {
    const navigatedTo: string[] = [];
    spyOn(service as any, 'navigateExternal').and.callFake((url: string) => {
      navigatedTo.push(url);
    });
    return navigatedTo;
  }

  it('does not navigate to Keycloak when features.keycloak is false', () => {
    const service = setup(false);
    const navigatedTo = watchNavigation(service);

    service.login('/view/uuid:123');

    expect(navigatedTo).toEqual([]);
  });

  it('navigates to the login endpoint when features.keycloak is true', () => {
    const service = setup(true);
    const navigatedTo = watchNavigation(service);

    service.login('/view/uuid:123');

    expect(navigatedTo.length).toBe(1);
    expect(navigatedTo[0]).toContain('/auth/login?redirect_uri=');
  });

  it('reports login availability through isLoginEnabled', () => {
    expect(setup(false).isLoginEnabled()).toBe(false);
    expect(setup(true).isLoginEnabled()).toBe(true);
  });
});

/**
 * Issue #168: every in-app login affordance goes through `startLogin()`, which
 * routes via the terms page and carries where the user should land afterwards —
 * the current page by default, or an explicit target (header "My library" →
 * saved lists rather than the page the user clicked it on).
 */
describe('AuthService.startLogin', () => {
  let router: Router;

  function setup(keycloak = true): AuthService {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: Store, useValue: { dispatch: () => {}, select: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }) } },
        AuthService,
        { provide: ConfigService, useValue: { isLoginEnabled: () => keycloak } },
        { provide: EnvironmentService, useValue: { getApiUrl: () => 'https://api.example.org/' } },
        { provide: LocalStorageService, useValue: { get: () => null, set: () => {}, remove: () => {} } },
        { provide: UserService, useValue: { loadUserData: () => Promise.resolve(), userSession: null } },
      ],
    });
    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    return TestBed.inject(AuthService);
  }

  function setCurrentUrl(url: string) {
    spyOnProperty(router, 'url', 'get').and.returnValue(url);
  }

  it('sends the user to the terms page with the current page as returnUrl', () => {
    const service = setup();
    setCurrentUrl('/view/uuid:1?page=uuid:2');

    service.startLogin();

    expect(router.navigate).toHaveBeenCalledWith(['pages/terms'], {
      queryParams: { returnUrl: '/view/uuid:1?page=uuid:2' },
    });
  });

  it('uses an explicit destination instead of the current page', () => {
    const service = setup();
    setCurrentUrl('/search?q=x');

    service.startLogin('/mzk/folders');

    expect(router.navigate).toHaveBeenCalledWith(['pages/terms'], {
      queryParams: { returnUrl: '/mzk/folders' },
    });
  });

  it('does not nest the terms page when login starts from the terms page', () => {
    const service = setup();
    setCurrentUrl('/pages/terms?returnUrl=%2Fview%2Fuuid%3A1');

    service.startLogin();

    expect(router.navigate).toHaveBeenCalledWith(['pages/terms'], {
      queryParams: { returnUrl: '/view/uuid:1' },
    });
  });

  it('does nothing when login is disabled', () => {
    const service = setup(false);

    service.startLogin('/folders');

    expect(router.navigate).not.toHaveBeenCalled();
  });
});
