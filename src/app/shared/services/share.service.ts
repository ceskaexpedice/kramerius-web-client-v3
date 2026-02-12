import { inject, Injectable } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private configService = inject(ConfigService);

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

    // Append library context if library switching is enabled and a library is active
    const activeLibCode = localStorage.getItem('CDK_DEV_KRAMERIUS_ID');
    if (activeLibCode && this.configService.isFeatureEnabled('librarySwitch')) {
      const finalUrlObj = new URL(finalUrl);
      finalUrlObj.searchParams.set('lib', activeLibCode);
      finalUrl = finalUrlObj.toString();
    }

    return finalUrl;
  }


}
