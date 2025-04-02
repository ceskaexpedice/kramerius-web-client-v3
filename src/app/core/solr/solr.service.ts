import { Injectable } from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import { Observable } from 'rxjs';
import {PeriodicalItem} from '../../modules/models/periodical-item';
import {SolrResponseParser} from './solr-response-parser';
import {map} from 'rxjs/operators';
import { SolrQueryBuilder } from './solr-query-builder';
import {BookItem} from '../../modules/models/book-item';
import {FacetItem} from '../../modules/models/facet-item';
import {SearchResultResponse} from '../../modules/models/search-result-response';

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

  loadFacet(query: string, filters: string[], facetField: string): Observable<any> {
    const filtered = SolrQueryBuilder.filterExcluding(filters, facetField.split('.')[0]);

    const rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.facetFields([facetField]),
      ...SolrQueryBuilder.sortByCreated(true),
      wt: 'json',
      ...SolrQueryBuilder.pagination(0, 0) // nepotrebujeme výsledky, len facet
    };

    let params = new HttpParams();
    Object.entries(rawParams).forEach(([key, value]) => {
      const val = value as string | number | boolean | Array<string | number | boolean>;

      if (Array.isArray(val)) {
        val.forEach(v => {
          params = params.append(key, v.toString());
        });
      } else {
        params = params.set(key, val.toString());
      }
    });

    params = params.set('q', query || '*:*');

    filtered.forEach(fq => {
      params = params.append('fq', fq);
    });

    return this.http.get<any>(this.API_URL, { params });
  }

  getFacetsWithout(
    query: string,
    filters: string[],
    staticFacetKeys: string[]
  ): Observable<SearchResultResponse> {
    const preservedFilters: string[] = filters.filter(f => {
      return staticFacetKeys.some(key => f.startsWith(`${key}:`));
    });

    const dynamicFilters: string[] = filters.filter(f => {
      return !staticFacetKeys.some(key => f.startsWith(`${key}:`));
    });

    const allFilters = [...preservedFilters, ...dynamicFilters];

    const params = this.buildParams(query, allFilters, 0, 0, true);
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  search(query: string, filters: string[] = [], start = 0, rows = 60): Observable<SearchResultResponse> {
    const params = this.buildParams(query, filters, start, rows, true);
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  private buildParams(query: string, filters: string[], start: number, rows: number, includeFacets = true): HttpParams {
    const rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([
        'pid', 'accessibility', 'model', 'authors', 'titles.search', 'title.search', 'root.title',
        'date.str', 'title.search_*', 'collection.desc', 'collection.desc_*',
        'licenses', 'contains_licenses', 'licenses_of_ancestors'
      ]),
      ...(includeFacets ? SolrQueryBuilder.facetFields([
        'keywords.facet', 'languages.facet', 'physical_locations.facet',
        'geographic_names.facet', 'authors.facet', 'publishers.facet',
        'publication_places.facet', 'own_model_path', 'genres.facet'
      ]) : {}),
      ...SolrQueryBuilder.sortByCreated(true),
      ...SolrQueryBuilder.pagination(start, rows),
      wt: 'json'
    };

    let params = new HttpParams();
    Object.entries(rawParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => {
          if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
            params = params.append(key, v.toString());
          }
        });
      } else if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean'
      ) {
        params = params.set(key, value.toString());
      }
    });

    params = params.set('q', query || '*:*');
    filters.forEach(fq => {
      params = params.append('fq', fq);
    });

    return params;
  }
}

