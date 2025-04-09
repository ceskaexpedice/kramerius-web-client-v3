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
  private readonly DEFAULT_FACET_FIELDS = [
    'model',
    'keywords.facet',
    'languages.facet',
    'physical_locations.facet',
    'geographic_names.facet',
    'authors.facet',
    'publishers.facet',
    'publication_places.facet',
    'own_model_path',
    'genres.facet',
  ];

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

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => SolrResponseParser.parseBookItems(res))
    );
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
      map(res => SolrResponseParser.parseFacetField<FacetItem>(
        res,
        'model',
        (value, count) => ({ name: value, count })
      ))
    );
  }

  private createHttpParams(rawParams: Record<string, any>): HttpParams {
    let params = new HttpParams();
    Object.entries(rawParams).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach(v => {
          params = params.append(key, v.toString());
        });
      } else if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        params = params.set(key, value.toString());
      }
    });
    return params;
  }

  private groupFiltersByField(filters: string[]): Map<string, string[]> {
    const filtersByField = new Map<string, string[]>();
    filters.forEach(filter => {
      const [field, value] = filter.split(':');
      if (!filtersByField.has(field)) {
        filtersByField.set(field, []);
      }
      filtersByField.get(field)?.push(value);
    });
    return filtersByField;
  }

  loadFacet(
    query: string,
    filters: string[],
    facetField: string,
    contains?: string,
    ignoreCase?: boolean
  ): Observable<any> {
    const filtered = SolrQueryBuilder.filterExcluding(filters, facetField.split('.')[0]);

    let rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.facetFields([facetField]),
      ...SolrQueryBuilder.sortByCreated(true),
      wt: 'json',
      ...SolrQueryBuilder.pagination(0, 0)
    };

    if (contains) {
      rawParams = {
        ...SolrQueryBuilder.facetContains(contains, ignoreCase),
        ...rawParams
      }
    }

    let params = this.createHttpParams(rawParams);
    params = params.set('q', query || '*:*');
    filtered.forEach(fq => {
      params = params.append('fq', fq);
    });


    return this.http.get<any>(this.API_URL, { params });
  }

  search(query: string, filters: string[] = [], start = 0, rows = 60): Observable<SearchResultResponse> {
    const params = this.buildParams(query, filters, start, rows, true);
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  private buildParams(query: string, filters: string[], start: number, rows: number, includeFacets = true): HttpParams {
    const filtersByField = this.groupFiltersByField(filters);

    const filterQueries: string[] = [];
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        const escapedValues = values.map(v => `"${v}"`);
        filterQueries.push(`(${field}:${escapedValues.join(` OR ${field}:`)})`);
      }
    });

    const rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([
        'pid', 'accessibility', 'model', 'authors', 'titles.search', 'title.search', 'root.title',
        'date.str', 'title.search_*', 'collection.desc', 'collection.desc_*',
        'licenses', 'contains_licenses', 'licenses_of_ancestors'
      ]),
      ...(includeFacets ? SolrQueryBuilder.facetFields(this.DEFAULT_FACET_FIELDS) : {}),
      ...SolrQueryBuilder.sortByCreated(true),
      ...SolrQueryBuilder.pagination(start, rows),
      wt: 'json'
    };

    let params = this.createHttpParams(rawParams);
    params = params.set('q', query || '*:*');

    if (filterQueries.length > 0) {
      params = params.append('fq', filterQueries.join(' AND '));
    }

    return params;
  }

  getFacetsWithOrOperator(
    query: string,
    filters: string[],
    facetFields: string[] = this.DEFAULT_FACET_FIELDS
  ): Observable<SearchResultResponse> {
    const filtersByField = this.groupFiltersByField(filters);

    const taggedFilters: string[] = [];
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        const escapedValues = values.map(v => `"${v}"`);
        taggedFilters.push(`{!tag=${field}}${field}:(${escapedValues.join(` OR ${field}:`)})`);
      }
    });

    const rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      wt: 'json',
      ...SolrQueryBuilder.pagination(0, 0)
    };

    let params = this.createHttpParams(rawParams);

    facetFields.forEach(field => {
      params = params.append('facet.field', `{!ex=${field}}${field}`);
    });

    params = params.set('q', query || '*:*');
    params = params.set('facet', 'true');
    params = params.set('facet.mincount', '1');

    taggedFilters.forEach(filter => {
      params = params.append('fq', filter);
    });

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getAutocompleteSuggestions(term: string): Observable<string[]> {
    const rawParams = {
      'q': `${term}*`,
      'defType': 'edismax',
      'qf': 'title.search',
      'fl': 'pid,title.search',
      'fq': ['accessibility:public', 'model:monograph OR model:periodical'],
      'rows': '50',
      'wt': 'json',
      'bq': ['model:monograph^5', 'model:periodical^5']
    };

    const params = this.createHttpParams(rawParams);

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs?.map((doc: { [key: string]: any }) => doc['title.search']) ?? [])
    );
  }
}

