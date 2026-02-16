import { inject, Injectable } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { LibraryContextService } from './library-context.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private configService = inject(ConfigService);
  private libraryContext = inject(LibraryContextService);

  getCurrentUrl(pid: string, isPage = false): string {
    const url = new URL(window.location.href);

    // Extract query parameters
    const searchParams = url.search;

    // Extract the UUID from the existing path
    const pathSegments = url.pathname.split('/');
    let uuidSegment = '';

    let finalUrl = url.origin;

    if (isPage) {
      uuidSegment = pathSegments.find(segment => segment.startsWith('uuid:')) || '';

      url.pathname = uuidSegment ? `/uuid/${uuidSegment}` : url.pathname;

      finalUrl += url.pathname + searchParams;
    } else {
      uuidSegment = pid;

      url.pathname = uuidSegment ? `/uuid/${uuidSegment}` : url.pathname;

      finalUrl += url.pathname;
    }

    // Prepend library prefix to shared URL path
    if (this.configService.isFeatureEnabled('librarySwitch')) {
      const prefix = this.libraryContext.getLibraryPrefix();
      if (prefix) {
        const finalUrlObj = new URL(finalUrl);
        finalUrlObj.pathname = `${prefix}${finalUrlObj.pathname}`;
        finalUrl = finalUrlObj.toString();
      }
    }

    return finalUrl;
  }


}
