import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';

/**
 * Route guards for config-gated features.
 *
 * Hiding the entry point in the UI is not enough: a route without a guard is
 * still reachable by typing its URL, and its component then runs the disabled
 * feature anyway (issue: `/libraries` loaded the registry with
 * `features.librarySwitch: false`). Every route that belongs to a
 * config-toggled feature gets a guard here, so a disabled feature is
 * unreachable rather than merely unadvertised.
 */

/**
 * Blocks the library-picker page unless the internal-only multi-library switch
 * (`features.librarySwitch`) is on. Mirrors `libraryPrefixGuard`, which already
 * guards the `/:libCode/*` routes.
 */
export const librarySwitchGuard: CanActivateFn = () => {
  const envService = inject(EnvironmentService);
  const router = inject(Router);

  if (envService.isLibrarySwitchEnabled()) {
    return true;
  }

  return router.createUrlTree(['/404']);
};

/**
 * Blocks routes that require a signed-in user when login is turned off
 * (`features.keycloak: false`). Without Keycloak there is no way to
 * authenticate, so these pages could only ever render an empty/broken state.
 */
export const loginEnabledGuard: CanActivateFn = () => {
  const configService = inject(ConfigService);
  const router = inject(Router);

  if (configService.isLoginEnabled()) {
    return true;
  }

  return router.createUrlTree(['/404']);
};

/**
 * Blocks the user folders / favorites pages when either `features.folders` or
 * `features.keycloak` is off — folders are stored per user account.
 */
export const foldersEnabledGuard: CanActivateFn = () => {
  const configService = inject(ConfigService);
  const router = inject(Router);

  if (configService.isFoldersEnabled()) {
    return true;
  }

  return router.createUrlTree(['/404']);
};
