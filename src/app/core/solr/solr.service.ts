import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {PeriodicalItem} from '../../modules/models/periodical-item';
import {SolrResponseParser} from './solr-response-parser';
import {map} from 'rxjs/operators';
import {SolrQueryBuilder} from './solr-query-builder';
import {BookItem} from '../../modules/models/book-item';
import {FacetItem} from '../../modules/models/facet-item';
import {SearchResultResponse} from '../../modules/models/search-result-response';
import {SolrSortDirections, SolrSortFields} from './solr-helpers';

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
      ...SolrQueryBuilder.sortBy(),
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
      ...SolrQueryBuilder.sortBy(),
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
    ignoreCase?: boolean,
    facetLimit?: number,
    facetOffset?: number,
    sortBy?: SolrSortFields,
    minCount: number = 1,
    existingOperators?: Record<string, string>
  ): Observable<any> {
    // Filter out filters for the current facet field
    const filtered = filters.filter(f => !f.startsWith(`${facetField}:`));

    // Group the remaining filters by field
    const filtersByField = this.groupFiltersByField(filtered);

    let rawParams = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.facetFields([facetField], minCount),
      ...SolrQueryBuilder.facetSortBy(sortBy),
      ...SolrQueryBuilder.pagination(0, 0)
    };

    if (contains) {
      rawParams = {
        ...SolrQueryBuilder.facetContains(contains, ignoreCase),
        ...rawParams
      }
    }

    // Create params and set query
    let params = this.createHttpParams(rawParams);
    params = params.set('q', query || '*:*');

    // Add filters with proper operators
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        // Get the operator from existing operators or default to OR
        const operator = existingOperators && existingOperators[field] === 'AND' ? 'AND' : 'OR';

        const escapedValues = values.map(v => `"${v}"`);
        if (values.length === 1) {
          params = params.append('fq', `${field}:${escapedValues[0]}`);
        } else {
          params = params.append('fq', `${field}:(${escapedValues.join(` ${operator} `)})`);
        }
      }
    });

    // Set facet pagination parameters
    if (facetLimit != null) {
      params = params.set('facet.limit', facetLimit.toString());
    }

    if (facetOffset != null) {
      params = params.set('facet.offset', facetOffset.toString());
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  search(query: string, filters: string[] = [], facetOperators: { [field: string]: 'AND' | 'OR' } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections): Observable<SearchResultResponse> {
    const params = this.buildParams(query, filters, facetOperators, page, pageCount, true, sortBy, sortDirection);
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  private buildParams(query: string, filters: string[], facetOperators: { [field: string]: 'AND' | 'OR' }, page: number, pageCount: number, includeFacets = true, sortBy = SolrSortFields.createdAt, sortDirection = SolrSortDirections.desc): HttpParams {
    const filtersByField = this.groupFiltersByField(filters);

    const filterQueries: string[] = [];
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        // we need if in url is field_operator=AND or field_operator=OR
        const operator = facetOperators[field] ?? 'OR';
        const escapedValues = values.map(v => `"${v}"`);
        filterQueries.push(`(${field}:${escapedValues.join(` ${operator} ${field}:`)})`);
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
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount),
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
    facetFields: string[] = this.DEFAULT_FACET_FIELDS,
    facetOperators: { [field: string]: 'AND' | 'OR' } = {}
  ): Observable<SearchResultResponse> {
    const filtersByField = this.groupFiltersByField(filters);

    const taggedFilters: string[] = [];
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        const operator = facetOperators[field] ?? 'OR';
        const escapedValues = values.map(v => `"${v}"`);
        taggedFilters.push(`{!tag=${field}}${field}:(${escapedValues.join(`${operator} ${field}:`)})`);
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

