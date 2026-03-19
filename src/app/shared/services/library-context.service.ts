import { Injectable } from '@angular/core';
import { APP_ROUTES_ENUM } from '../../app.routes';

/** Routes that should never be prefixed with a library code */
const UNPREFIXED_ROUTES = new Set<string>([
  APP_ROUTES_ENUM.AUTH_CALLBACK,
  APP_ROUTES_ENUM.ABOUT,
  APP_ROUTES_ENUM.TERMS,
  APP_ROUTES_ENUM.LIBRARIES,
  APP_ROUTES_ENUM.DEV_TOOLS,
  APP_ROUTES_ENUM.NOT_FOUND,
  APP_ROUTES_ENUM.SERVER_ERROR,
  APP_ROUTES_ENUM.PAGES,
]);

@Injectable({ providedIn: 'root' })
export class LibraryContextService {

  getActiveLibraryCode(): string | null {
    const code = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
    if (!code || code === 'mzk') return null;
    return code;
  }

  getLibraryPrefix(): string {
    const code = this.getActiveLibraryCode();
    return code ? `/${code}` : '';
  }

  prependLibraryPrefix(segments: any[]): any[] {
    const code = this.getActiveLibraryCode();
    if (!code) return segments;
    // Prefix the first segment with the library code
    // e.g. ['/'] → ['/knav'], ['/search'] → ['/knav', 'search'], ['/view', pid] → ['/knav', 'view', pid]
    if (segments.length > 0 && typeof segments[0] === 'string' && segments[0].startsWith('/')) {
      const rest = segments[0].substring(1); // strip leading '/'
      if (rest) {
        return [`/${code}`, rest, ...segments.slice(1)];
      }
      return [`/${code}`, ...segments.slice(1)];
    }
    return [`/${code}`, ...segments];
  }

  /**
   * Checks whether a URL path already has the active library prefix,
   * or is an unprefixed route that should never get one.
   * Returns the corrected URL if a prefix needs to be added, or null if no change is needed.
   */
  ensureLibraryPrefix(url: string): string | null {
    const code = this.getActiveLibraryCode();
    if (!code) return null;

    const prefix = `/${code}`;
    const [path, queryString] = url.split('?');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // Already prefixed
    if (cleanPath.startsWith(`${prefix}/`) || cleanPath === prefix) {
      return null;
    }

    // Check if this is a route that should never be prefixed
    const firstSegment = cleanPath.split('/').filter(Boolean)[0] || '';
    for (const route of UNPREFIXED_ROUTES) {
      if (route && firstSegment === route.split('/')[0]) {
        return null;
      }
    }

    // Needs prefix
    const prefixedPath = cleanPath === '/' ? prefix : `${prefix}${cleanPath}`;
    return queryString ? `${prefixedPath}?${queryString}` : prefixedPath;
  }
}
