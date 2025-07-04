import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';

export interface CitationResponse {
  iso690?: string;
  iso690html?: string;
  mla?: string;
  bibtex?: string;
  wiki?: string;
  ris?: string;
  [key: string]: string | undefined;
}

@Injectable({
  providedIn: 'root'
})
export class CitationService {
  private baseUrl = 'https://citace.ceskadigitalniknihovna.cz/api/v1';

  constructor(private http: HttpClient) {}

  getCitation(options: {
    url: string;
    uuid: string;
    exp: string;
    format?: 'txt' | 'html';
    lang?: string;
    ref?: string;
    debug?: boolean;
  }): Observable<CitationResponse> {
    let params = new HttpParams()
      .set('url', options.url)
      .set('uuid', options.uuid)
      .set('exp', options.exp);

    if (options.format) params = params.set('format', options.format);
    if (options.lang) params = params.set('lang', options.lang);
    if (options.ref) params = params.set('ref', options.ref);
    if (options.debug !== undefined) params = params.set('debug', options.debug.toString());

    return this.http.get<CitationResponse>(this.baseUrl, { params });
  }
}
