import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {SolrResponseParser} from './solr-response-parser';
import {SolrQueryBuilder} from './solr-query-builder';
import {SolrOperators, SolrSortDirections, SolrSortFields} from './solr-helpers';
import {SearchResultResponse} from '../../modules/models/search-result-response';
import {PeriodicalItem} from '../../modules/models/periodical-item';
import {BookItem} from '../../modules/models/book-item';
import {FacetItem} from '../../modules/models/facet-item';
import {environment} from '../../../environments/environment';
import {DEFAULT_FACET_FIELDS} from '../../modules/search-results-page/const/facet-fields';
import {SEARCH_RETURN_FIELDS} from '../../modules/search-results-page/const/search-return-fields';

@Injectable({ providedIn: 'root' })
export class SolrService {
  private readonly API_URL = `${environment.krameriusBaseUrl}/search`;

  constructor(private http: HttpClient) {}

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

  private createFacetBaseParams(options: any = {}): Record<string, any> {
    const params: Record<string, any> = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.pagination(0, 0),
      facet: 'true',
      'facet.mincount': (options.minCount || 1).toString()
    };
    if (options.sortBy) Object.assign(params, SolrQueryBuilder.facetSortBy(options.sortBy));
    if (options.searchTerm) Object.assign(params, SolrQueryBuilder.facetContains(options.searchTerm, true));
    if (options.limit !== undefined) params['facet.limit'] = options.limit.toString();
    if (options.offset !== undefined) params['facet.offset'] = options.offset.toString();
    return params;
  }

  private buildQParam(query: string, advancedQuery?: string): string {
    const parts = [];
    if (query?.trim()) parts.push(`(${SolrQueryBuilder.buildQueryFromInput(query, 'AND', 'titles.search')})`);
    if (advancedQuery?.trim()) parts.push(`(${advancedQuery})`);
    return parts.length ? parts.join(' AND ') : '*:*';
  }

  private buildFqParams(filters: string[], operators: Record<string, string> = {}): string[] {
    const grouped = this.groupFiltersByField(filters);
    const fq: string[] = [];
    grouped.forEach((values, field) => {
      const op = operators[field] || SolrOperators.or;
      const escaped = values.map(v => `"${v}"`);
      let fqParam = '';

      if (op === SolrOperators.or) {
        fqParam += `{!tag=${field}}`;
      }

      fqParam += values.length === 1
        ? `${field}:${escaped[0]}`
        : `(${escaped.map(val => `${field}:${val}`).join(` ${op} `)})`;

      fq.push(fqParam);
    });
    return fq;
  }

  private buildFacetFieldParams(fields: string[], filtersByField: Map<string, string[]>, operators: Record<string, string>): string[] {
    return fields.map(field => {
      const op = operators[field] || SolrOperators.or;
      const hasFilter = filtersByField.has(field) && filtersByField.get(field)!.length > 0;
      return op === SolrOperators.or && hasFilter ? `{!ex=${field}}${field}` : field;
    });
  }

  search(query: string, filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections, advancedQuery?: string): Observable<SearchResultResponse> {
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.baseFilters(),
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.facetFields(DEFAULT_FACET_FIELDS),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount)
    };
    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery));
    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getFacetsWithOperators(query: string, filters: string[], facetFields: string[] = DEFAULT_FACET_FIELDS, facetOperators: { [field: string]: SolrOperators } = {}, advancedQuery?: string): Observable<SearchResultResponse> {
    const filtersByField = this.groupFiltersByField(filters);
    const paramsObject = this.createFacetBaseParams();
    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery));

    this.buildFacetFieldParams(facetFields, filtersByField, facetOperators).forEach(field => {
      params = params.append('facet.field', field);
    });

    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  loadFacetWithPendingChanges(query: string, allFilters: string[], currentFacet: string, pendingSelections: Set<string>, pendingOperator: SolrOperators, otherOperators: Record<string, string> = {}, options: any = {}): Observable<any> {
    const { advancedQuery } = options;
    const paramsObject = this.createFacetBaseParams(options);
    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery));
    const otherFilters = allFilters.filter(f => !f.startsWith(`${currentFacet}:`));
    params = this.addFilterQueries(params, otherFilters, otherOperators);

    const isOrWithSelection = pendingOperator === SolrOperators.or && pendingSelections.size > 0;
    params = params.append('facet.field', isOrWithSelection ? `{!ex=${currentFacet}}${currentFacet}` : currentFacet);

    if (pendingSelections.size > 0) {
      const values = Array.from(pendingSelections);
      const escaped = values.map(v => `"${v}"`);
      let fqParam = isOrWithSelection ? `{!tag=${currentFacet}}` : '';
      fqParam += values.length === 1 ? `${currentFacet}:${escaped[0]}` : `(${escaped.map(val => `${currentFacet}:${val}`).join(` ${pendingOperator} `)})`;
      params = params.append('fq', fqParam);
    }

    return this.http.get<any>(this.API_URL, { params });
  }

  loadFacet(query: string, filters: string[], facetField: string, contains?: string, ignoreCase?: boolean, facetLimit?: number, facetOffset?: number, sortBy?: SolrSortFields, minCount: number = 1, existingOperators?: Record<string, string>): Observable<any> {
    const paramsObject = this.createFacetBaseParams({
      searchTerm: contains,
      limit: facetLimit,
      offset: facetOffset,
      sortBy,
      minCount
    });
    let params = this.createHttpParams(paramsObject).set('q', query || '*:*').append('facet.field', facetField);
    const otherFilters = filters.filter(f => !f.startsWith(`${facetField}:`));
    params = this.addFilterQueries(params, otherFilters, existingOperators);
    return this.http.get<any>(this.API_URL, { params });
  }

  getSuggestionsByFacetKey(solrField: string, term: string): Observable<string[]> {
    return this.loadFacet('*:*', [], solrField, term, true, 20, 0, SolrSortFields.count, 1).pipe(
      map(res => SolrResponseParser.parseFacet(res.facet_counts.facet_fields?.[solrField] || []).map(f => f.name))
    );
  }

  getAutocompleteSuggestions(term: string): Observable<string[]> {
    const query = SolrQueryBuilder.buildQueryFromInput(term);
    const paramsObject = {
      q: query,
      fl: 'pid,title.search',
      fq: ['accessibility:public', 'level:0'],
      rows: '50',
      wt: 'json',
    };
    const params = this.createHttpParams(paramsObject);
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs?.map((doc: any) => doc['title.search']) ?? [])
    );
  }

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
    const params = new HttpParams({ fromObject: SolrQueryBuilder.facetByField('genres.facet') });
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => SolrResponseParser.parseFacetField<FacetItem>(res, 'genres.facet', SolrResponseParser.mapToGenreItem))
    );
  }

  getDocumentTypes(): Observable<FacetItem[]> {
    const params = new HttpParams({ fromObject: SolrQueryBuilder.facetByModel() });
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => SolrResponseParser.parseFacetField<FacetItem>(res, 'model', (value, count) => ({ name: value, count })))
    );
  }

  getDetailItem(pid: string): Observable<any> {
    const params = new HttpParams({ fromObject: { q: `pid:"${pid}"`, ...SolrQueryBuilder.rows(1) } });
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
    const params = { q: query, fl: 'date.str, pid, accessibility', rows: '10000', sort: 'date.min asc', wt: 'json' };
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getPeriodicalItems(pid: string): Observable<any[]> {
    const query = SolrQueryBuilder.buildBooleanQuery([
      `!pid:${SolrQueryBuilder.escapeSolrQuery(pid)}`,
      `own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(pid)}`,
      `(model:periodicalitem OR model:supplement OR model:page)`
    ]);
    const params = {
      q: query,
      fl: 'date.str, pid, accessibility',
      rows: '10000',
      sort: 'date.min asc, part.number.sort asc, model asc, issue.type.sort asc',
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
        const operator = operators[field] || SolrOperators.or;
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
}
