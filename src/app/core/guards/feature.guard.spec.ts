import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';
import { foldersEnabledGuard, librarySwitchGuard, loginEnabledGuard } from './feature.guard';

/**
 * Regression tests for config-gated routes.
 *
 * A UI entry point that is merely hidden is not disabled: `/libraries` had no
 * guard at all, so typing the URL loaded the library picker and hit the central
 * registry even with `features.librarySwitch: false`. Same class of bug for the
 * login-only routes when `features.keycloak` is off.
 */
describe('feature route guards', () => {

  /** Runs a CanActivateFn inside an injection context, as the router would. */
  function run(guard: any): boolean | UrlTree {
    return TestBed.runInInjectionContext(() => guard({} as any, {} as any)) as boolean | UrlTree;
  }

  function expectRedirectTo404(result: boolean | UrlTree): void {
    const router = TestBed.inject(Router);
    expect(result instanceof UrlTree).toBe(true, 'expected a redirect, not a plain boolean');
    expect(router.serializeUrl(result as UrlTree)).toBe('/404');
  }

  function configure(opts: { librarySwitch?: boolean; keycloak?: boolean; folders?: boolean }): void {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: EnvironmentService,
          useValue: { isLibrarySwitchEnabled: () => opts.librarySwitch ?? false },
        },
        {
          provide: ConfigService,
          useValue: {
            isLoginEnabled: () => opts.keycloak ?? true,
            isFoldersEnabled: () => (opts.keycloak ?? true) && (opts.folders ?? true),
          },
        },
      ],
    });
  }

  describe('librarySwitchGuard', () => {
    it('blocks /libraries when features.librarySwitch is off', () => {
      configure({ librarySwitch: false });
      expectRedirectTo404(run(librarySwitchGuard));
    });

    it('allows /libraries when features.librarySwitch is on', () => {
      configure({ librarySwitch: true });
      expect(run(librarySwitchGuard)).toBe(true);
    });
  });

  describe('loginEnabledGuard', () => {
    it('blocks login-only routes when features.keycloak is off', () => {
      configure({ keycloak: false });
      expectRedirectTo404(run(loginEnabledGuard));
    });

    it('allows login-only routes when features.keycloak is on', () => {
      configure({ keycloak: true });
      expect(run(loginEnabledGuard)).toBe(true);
    });
  });

  describe('foldersEnabledGuard', () => {
    it('blocks /folders when features.folders is off', () => {
      configure({ keycloak: true, folders: false });
      expectRedirectTo404(run(foldersEnabledGuard));
    });

    it('blocks /folders when login is off, even with features.folders on', () => {
      configure({ keycloak: false, folders: true });
      expectRedirectTo404(run(foldersEnabledGuard));
    });

    it('allows /folders when both flags are on', () => {
      configure({ keycloak: true, folders: true });
      expect(run(foldersEnabledGuard)).toBe(true);
    });
  });
});
