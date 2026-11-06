import { inject } from '@angular/core';
import { CanActivateFn, RedirectCommand, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Landing route after a confirmed Keycloak logout (`/auth/logged-out?returnUrl=…`).
 *
 * Injecting `AuthService` guarantees it has been constructed, which is where the
 * stored session gets cleared (`completeLogoutIfReturning`). The guard then
 * replaces this history entry with the page the user clicked logout on, so Back
 * doesn't land on the logout route again.
 */
export const logoutReturnGuard: CanActivateFn = (route) => {
  inject(AuthService);
  const router = inject(Router);
  const returnUrl = safeReturnUrl(route.queryParamMap.get('returnUrl'));
  return new RedirectCommand(router.parseUrl(returnUrl), { replaceUrl: true });
};

/** Only same-origin app paths; never protocol-relative URLs or the auth routes. */
export function safeReturnUrl(url: string | null): string {
  if (!url || !url.startsWith('/') || url.startsWith('//') || url.startsWith('/auth/')) {
    return '/';
  }
  return url;
}
