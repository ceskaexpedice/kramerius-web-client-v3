import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import {PeriodicalItem} from '../../modules/models/periodical-item';
import {SolrResponseParser} from './solr-response-parser';
import {map} from 'rxjs/operators';
import { SolrQueryBuilder } from './solr-query-builder';
import {BookItem} from '../../modules/models/book-item';
import {FacetItem} from '../../modules/models/facet-item';

@Injectable({
  providedIn: 'root'
})
export class SolrService {
  private readonly API_URL = 'https://api.kramerius.mzk.cz/search/api/client/v7.0/search';

  constructor(private http: HttpClient) {}

  getPeriodicals(): Observable<PeriodicalItem[]> {
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.filterByModel('periodical'),
      ...SolrQueryBuilder.sortByCreated(true),
      ...SolrQueryBuilder.rows(100),
      ...SolrQueryBuilder.start(0)
    };

    const params = new HttpParams({ fromObject: paramsObject });

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(response => SolrResponseParser.parsePeriodicalItems(response))
    );
  }

  getBooks(): Observable<BookItem[]> {
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.filterByModel('monograph'),
      ...SolrQueryBuilder.sortByCreated(true),
      ...SolrQueryBuilder.rows(100)
    };

    const params = new HttpParams({ fromObject: paramsObject });

    return this.http
      .get<any>(this.API_URL, { params })
      .pipe(map(res => SolrResponseParser.parseBookItems(res)));
  }

  getGenres(): Observable<FacetItem[]> {
    const params = new HttpParams({
      fromObject: SolrQueryBuilder.facetByField('genres.facet')
    });

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => SolrResponseParser.parseFacetField<FacetItem>(
        res,
        'genres.facet',
        SolrResponseParser.mapToGenreItem
      ))
    );
  }

  getDocumentTypes(): Observable<FacetItem[]> {
    const params = new HttpParams({
      fromObject: SolrQueryBuilder.facetByModel()
    });

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res =>
        SolrResponseParser.parseFacetField<FacetItem>(
          res,
          'model',
          (value, count) => ({ name: value, count })
        )
      )
    );
  }
}

