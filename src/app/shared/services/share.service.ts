import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ShareService {

  constructor() { }

  getCurrentUrl(): string {
    const url = new URL(window.location.href);

    // Extract query parameters
    const searchParams = url.search;

    // Extract the UUID from the existing path
    const pathSegments = url.pathname.split('/');
    const uuidSegment = pathSegments.find(segment => segment.startsWith('uuid:'));

    // Adjust the path structure to the desired format
    url.pathname = uuidSegment ? `/uuid/${uuidSegment}` : url.pathname;

    // Preserve the original query parameters
    return url.origin + url.pathname + searchParams;
  }


}
