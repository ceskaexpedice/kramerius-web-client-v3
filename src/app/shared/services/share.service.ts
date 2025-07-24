import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  constructor() { }

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

    return finalUrl;
  }


}
