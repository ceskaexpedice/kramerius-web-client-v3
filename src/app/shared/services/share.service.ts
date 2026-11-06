import { inject, Injectable } from '@angular/core';
import { LibraryContextService } from './library-context.service';
import { EnvironmentService } from './environment.service';
import { CdkSourceService } from './cdk-source.service';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  private libraryContext = inject(LibraryContextService);
  private env = inject(EnvironmentService);
  private cdkSource = inject(CdkSourceService);

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

    // CDK: carry the selected member library. Page pids (and therefore `?bb=`
    // crops) belong to one library's copy — without `?source=` the receiver
    // lands on the leader library, where the page doesn't exist (falls back to
    // page 1) or its image isn't served, so a shared crop showed nothing (#187).
    // `?source=` in the URL wins over cdk.leader on the receiving side.
    const source = this.cdkSource.getCode();
    if (source) {
      const finalUrlObj = new URL(finalUrl);
      finalUrlObj.searchParams.set('source', source);
      finalUrl = finalUrlObj.toString();
    }

    // Prepend library prefix to shared URL path (internal library switch only)
    if (this.env.isLibrarySwitchEnabled()) {
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
