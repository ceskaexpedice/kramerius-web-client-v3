import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authCallbackGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // If user is already authenticated, redirect them to home or their intended destination
  if (authService.hasValidToken()) {
    console.log('AuthCallbackGuard: User already authenticated, redirecting away from callback');
    
    const originalRoute = authService.getOriginalRoute();
    if (originalRoute) {
      authService.clearOriginalRoute();
      router.navigateByUrl(originalRoute);
    } else {
      router.navigate(['/']);
    }
    
    return false;
  }

  // Allow access to callback page for unauthenticated users
  return true;
};