import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { ConfigService } from '../config/config.service';

const libraryCache = new Map<string, { code: string; url: string } | null>();

async function loadLibraryByCode(code: string): Promise<{ code: string; url: string } | null> {
  if (libraryCache.has(code)) return libraryCache.get(code)!;

  try {
    const response = await fetch(ConfigService.getLibraryByCodeUrl(code));
    if (!response.ok) {
      libraryCache.set(code, null);
      return null;
    }
    const library = await response.json();
    libraryCache.set(code, library);
    return library;
  } catch (err) {
    console.warn('libraryPrefixGuard: Failed to load library', code, err);
    libraryCache.set(code, null);
    return null;
  }
}

export const libraryPrefixGuard: CanActivateFn = async (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);
  const libCode = route.params['libCode'];

  if (!libCode) {
    return router.createUrlTree(['/404']);
  }

  const library = await loadLibraryByCode(libCode);

  if (!library) {
    return router.createUrlTree(['/404']);
  }

  // If library changed, set localStorage and reload so env/config pick up new API URLs
  const currentCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
  if (currentCode !== libCode) {
    localStorage.setItem('CDK_DEV_BASE_URL', library.url);
    localStorage.setItem('CDK_DEV_KRAMERIUS_ID', library.code);
    window.location.reload();
    return false;
  }

  return true;
};
