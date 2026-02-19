import { Injectable } from '@angular/core';

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
}
