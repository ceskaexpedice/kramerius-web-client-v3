import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SolrService {
  private readonly API_URL = 'https://api.kramerius.mzk.cz/search/api/client/v7.0/search';

  constructor(private http: HttpClient) {}

  getPeriodicals(): Observable<any> {
    const params = {
      q: '*:*',
      fq: 'model:periodical',
      sort: 'created desc',
      rows: 100,
      start: 0,
      wt: 'json'
    };

    return this.http.get<any>(this.API_URL, { params });
  }

  getBooks(): Observable<any> {
    const params = {
      q: '*:*',
      fq: 'model:monograph',
      sort: 'created desc',
      rows: 100,
      start: 0,
      wt: 'json'
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  getGenres(): Observable<any> {
    const params = {
      q: '*:*',
      rows: 0,
      facet: true,
      'facet.field': 'genres.facet',
      'facet.limit': 100,
      'facet.sort': 'count',
      wt: 'json'
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  // ďalšie metódy: getBooks(), getGenres(), getAuthors() atď.
}
