import { inject } from '@angular/core';
import { CanMatchFn, Route, UrlSegment } from '@angular/router';
import { ConfigService } from '../config/config.service';
import { EnvironmentService } from '../../shared/services/environment.service';

const libraryCache = new Map<string, { code: string; url: string } | null>();

/** Test seam: the module-level cache would otherwise leak between specs. */
export function __resetLibraryCacheForTests(): void {
  libraryCache.clear();
}

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

/**
 * Guards the dynamic `/:libCode` prefix route.
 *
 * This is a `canMatch` guard, not `canActivate`, and the difference matters:
 * `canActivate` runs only after a route has been chosen, so `:libCode` — the last
 * single-segment route — swallowed every unknown URL and could never fall through
 * to the `**` wildcard. Declining to *match* leaves the URL for the routes behind
 * it, so a bad address reaches the real 404 page without this guard redirecting,
 * and without a registry lookup for what was never a library code.
 */
export const libraryPrefixGuard: CanMatchFn = async (_route: Route, segments: UrlSegment[]) => {
  const envService = inject(EnvironmentService);

  // The library switch is an internal-only feature. When it's off the client is
  // pinned to a single Kramerius and must never hit the central registry, so
  // library-prefixed routes are not available.
  if (!envService.isLibrarySwitchEnabled()) {
    return false;
  }

  // Under canMatch the parameter is not bound yet; the code is the first segment.
  const libCode = segments[0]?.path;

  if (!libCode) {
    return false;
  }

  const currentCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
  const currentUrl = localStorage.getItem('CDK_DEV_BASE_URL');

  if (currentCode === libCode && currentUrl) {
    return true;
  }

  const library = await loadLibraryByCode(libCode);

  if (!library) {
    return false;
  }

  // If library changed, set localStorage and reload so env/config pick up new API URLs
  if (currentCode !== libCode) {
    localStorage.setItem('CDK_DEV_BASE_URL', library.url);
    localStorage.setItem('CDK_DEV_KRAMERIUS_ID', library.code);
    window.location.reload();
    return false;
  }

  return true;
};
