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
import {FilterService} from '../services/FilterUtilities';

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

  constructor(private http: HttpClient, private filterService: FilterService) {}

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

  /**
   * Helper method to create HttpParams from a raw params object
   */
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

  /**
   * Groups filter strings (field:value) by their field
   */
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

  /**
   * Creates base parameters for facet queries
   */
  private createFacetBaseParams(
    options: {
      searchTerm?: string,
      limit?: number,
      offset?: number,
      sortBy?: SolrSortFields,
      minCount?: number
    } = {}
  ): Record<string, any> {
    // Build base parameters
    let params: Record<string, any> = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.pagination(0, 0),
      facet: 'true',
      'facet.mincount': (options.minCount || 1).toString()
    };

    // Add sort if provided
    if (options.sortBy) {
      params = { ...params, ...SolrQueryBuilder.facetSortBy(options.sortBy) };
    }

    // Add search term if provided
    if (options.searchTerm) {
      params = { ...params, ...SolrQueryBuilder.facetContains(options.searchTerm, true) };
    }

    // Add pagination if provided
    if (options.limit !== undefined) {
      params['facet.limit'] = options.limit.toString();
    }

    if (options.offset !== undefined) {
      params['facet.offset'] = options.offset.toString();
    }

    return params;
  }

  /**
   * Adds filters to params with proper operators
   */
  private addFilterQueries(
    params: HttpParams,
    filters: string[],
    operators: Record<string, string> = {},
    skipField?: string
  ): HttpParams {
    const filtersByField = this.groupFiltersByField(filters);
    let result = params;

    filtersByField.forEach((values, field) => {
      if (values.length > 0 && field !== skipField) {
        const operator = operators[field] || 'OR';
        const escapedValues = values.map(v => `"${v}"`);

        if (values.length === 1) {
          result = result.append('fq', `${field}:${escapedValues[0]}`);
        } else {
          result = result.append('fq', `${field}:(${escapedValues.join(` ${operator} ${field}:`)})`);
        }
      }
    });

    return result;
  }

  /**
   * Specialized method to load facet with pending changes (preview)
   */
  loadFacetWithPendingChanges(
    query: string,
    allFilters: string[],
    currentFacet: string,
    pendingSelections: Set<string>,
    pendingOperator: 'AND' | 'OR',
    otherOperators: Record<string, string> = {},
    options: {
      searchTerm?: string,
      limit?: number,
      offset?: number,
      sortBy?: SolrSortFields,
      minCount?: number
    } = {}
  ): Observable<any> {
    // Create base parameters
    const paramsObject = this.createFacetBaseParams(options);
    let params = this.createHttpParams(paramsObject);

    // Set query
    params = params.set('q', query || '*:*');

    // Filter out current facet from filters
    const otherFilters = allFilters.filter(f => !f.startsWith(`${currentFacet}:`));

    // Add other filters
    params = this.addFilterQueries(params, otherFilters, otherOperators);

    // Handle the current facet with pending selections
    const isOrWithSelection = pendingOperator === 'OR' && pendingSelections.size > 0;

    // Set the facet field with exclude tag if needed
    if (isOrWithSelection) {
      params = params.append('facet.field', `{!ex=${currentFacet}}${currentFacet}`);
    } else {
      params = params.append('facet.field', currentFacet);
    }

    // Add the pending selections as filter
    if (pendingSelections.size > 0) {
      const values = Array.from(pendingSelections);
      const escapedValues = values.map(v => `"${v}"`);

      let fqParam = '';

      // Add tag for OR operator
      if (isOrWithSelection) {
        fqParam += `{!tag=${currentFacet}}`;
      }

      // Add field and values
      if (values.length === 1) {
        fqParam += `${currentFacet}:${escapedValues[0]}`;
      } else {
        fqParam += `${currentFacet}:(${escapedValues.join(` ${pendingOperator} ${currentFacet}:`)})`;
      }

      params = params.append('fq', fqParam);
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  /**
   * Load facet data with given filters and pagination
   */
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
    // Create base parameters
    const paramsObject = this.createFacetBaseParams({
      searchTerm: contains,
      limit: facetLimit,
      offset: facetOffset,
      sortBy,
      minCount
    });

    let params = this.createHttpParams(paramsObject);

    // Set query
    params = params.set('q', query || '*:*');

    // Add facet field
    params = params.append('facet.field', facetField);

    // Filter out current facet and add other filters
    const otherFilters = filters.filter(f => !f.startsWith(`${facetField}:`));
    params = this.addFilterQueries(params, otherFilters, existingOperators);

    return this.http.get<any>(this.API_URL, { params });
  }

  /**
   * Search with filters, pagination and sorting
   */
  search(
    query: string,
    filters: string[] = [],
    facetOperators: { [field: string]: 'AND' | 'OR' } = {},
    page = 0,
    pageCount = 60,
    sortBy: SolrSortFields,
    sortDirection: SolrSortDirections
  ): Observable<SearchResultResponse> {
    // Create base parameters
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([
        'pid', 'accessibility', 'model', 'authors', 'titles.search',
        'title.search', 'root.title', 'date.str', 'title.search_*',
        'collection.desc', 'collection.desc_*', 'licenses',
        'contains_licenses', 'licenses_of_ancestors'
      ]),
      ...SolrQueryBuilder.facetFields(this.DEFAULT_FACET_FIELDS),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount)
    };

    let params = this.createHttpParams(paramsObject);

    // Set query
    const finalQuery = SolrQueryBuilder.buildQueryFromInput(query, 'AND', 'titles.search');
    params = params.set('q', finalQuery);

    // Group filters by field and create filter queries
    const filtersByField = this.groupFiltersByField(filters);
    const filterQueries: string[] = [];

    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        const operator = facetOperators[field] || 'OR';
        const escapedValues = values.map(v => `"${v}"`);
        filterQueries.push(`(${field}:${escapedValues.join(` ${operator} ${field}:`)})`);
      }
    });

    // Add all filter queries as a single AND-joined fq parameter
    if (filterQueries.length > 0) {
      params = params.append('fq', filterQueries.join(' AND '));
    }

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getDetailItem(pid: string): Observable<any> {
    const params = new HttpParams({
      fromObject: {
        q: `pid:"${pid}"`,
        ...SolrQueryBuilder.rows(1)
      }
    });

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs[0] ?? null)
    );
  }

  getPeriodicalVolumes(pid: string): Observable<any[]> {
    const query = SolrQueryBuilder.buildBooleanQuery([
      `!pid:${SolrQueryBuilder.escapeSolrQuery(pid)}`,
      `own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(pid)}`,
      `(model:periodicalvolume)`
    ]);
    const params = {
      q: query,
      fl: 'date.str, pid',
      rows: '10000',
      sort: 'date.min asc',
      wt: 'json'
    };

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getChildrenByModel(parentPid: string, model: string): Observable<any[]> {
    const query = `!pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)} AND own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)} AND (model:${model})`;
    const params = {
      q: query,
      fl: 'pid,accessibility,model,title.search,date.str',
      rows: '10000',
      sort: 'date.min asc',
      wt: 'json'
    };

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  /**
   * Get facets with proper operators (OR/AND)
   */
  getFacetsWithOperators(
    query: string,
    filters: string[],
    facetFields: string[] = this.DEFAULT_FACET_FIELDS,
    facetOperators: { [field: string]: 'AND' | 'OR' } = {}
  ): Observable<SearchResultResponse> {
    // Create base parameters
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.pagination(0, 0),
      facet: 'true',
      'facet.mincount': '1'
    };

    let params = this.createHttpParams(paramsObject);

    // Set query
    const finalQuery = SolrQueryBuilder.buildQueryFromInput(query, 'AND', 'titles.search');
    params = params.set('q', finalQuery);

    // Group filters by field
    const filtersByField = this.groupFiltersByField(filters);

    // Add facet fields with exclude tags for OR operators
    facetFields.forEach(field => {
      const operator = facetOperators[field] || 'OR';
      const hasFilter = filtersByField.has(field) && filtersByField.get(field)!.length > 0;

      if (operator === 'OR' && hasFilter) {
        params = params.append('facet.field', `{!ex=${field}}${field}`);
      } else {
        params = params.append('facet.field', field);
      }
    });

    // Add filters with tags for OR operators
    filtersByField.forEach((values, field) => {
      if (values.length > 0) {
        const operator = facetOperators[field] || 'OR';
        const escapedValues = values.map(v => `"${v}"`);

        let fqParam = '';

        // Add tag for OR operators
        if (operator === 'OR') {
          fqParam += `{!tag=${field}}`;
        }

        // Add field and values
        if (values.length === 1) {
          fqParam += `${field}:${escapedValues[0]}`;
        } else {
          fqParam += `${field}:(${escapedValues.join(` ${operator} ${field}:`)})`;
        }

        params = params.append('fq', fqParam);
      }
    });

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  /**
   * Get autocomplete suggestions for a search term
   */
  getAutocompleteSuggestions(term: string): Observable<string[]> {
    const query = SolrQueryBuilder.buildQueryFromInput(term);
    const paramsObject = {
      'q': query,
      'fl': 'pid,title.search',
      'fq': ['accessibility:public'],
      'rows': '50',
      'wt': 'json',
    };

    const params = this.createHttpParams(paramsObject);

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs?.map((doc: { [key: string]: any }) => doc['title.search']) ?? [])
    );
  }
}
