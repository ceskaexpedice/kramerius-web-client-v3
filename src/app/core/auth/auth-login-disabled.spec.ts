import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
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
