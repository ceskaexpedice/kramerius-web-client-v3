import {Injectable} from '@angular/core';
import {HttpClient, HttpParams} from '@angular/common/http';
import {forkJoin, Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {SolrResponseParser} from './solr-response-parser';
import {SolrQueryBuilder} from './solr-query-builder';
import {SolrOperators, SolrSortDirections, SolrSortFields} from './solr-helpers';
import {SearchResultResponse} from '../../modules/models/search-result-response';
import {FacetItem} from '../../modules/models/facet-item';
import {
  DEFAULT_FACET_FIELDS,
  DEFAULT_PERIODICAL_FACET_FIELDS,
} from '../../modules/search-results-page/const/facet-fields';
import {SEARCH_RETURN_FIELDS} from '../../modules/search-results-page/const/search-return-fields';
import {EnvironmentService} from '../../shared/services/environment.service';
import {SolrUtils} from './solr-utils';
import {DocumentTypeEnum} from '../../modules/constants/document-type';
import {SearchDocument} from '../../modules/models/search-document';

@Injectable({ providedIn: 'root' })
export class SolrService {

  constructor(
    private http: HttpClient,
    private env: EnvironmentService
  ) {
  }

  private get API_URL(): string {
    const url = this.env.getApiUrl('search');
    if (!url) {
      console.warn('AuthService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  private get API_BASE_URL(): string {
    const url = this.env.getApiUrl();
    if (!url) {
      console.warn('AuthService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
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

  private createFacetBaseParams(options: any = {}, addBaseFilters = false, baseFilters: { fq: string } | null  = null): Record<string, any> {
    let params: Record<string, any> = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn([]),
      ...SolrQueryBuilder.pagination(0, 0),
      facet: 'true',
      'facet.mincount': (options.minCount || 1).toString()
    };

    // if (baseFilters) {
    //   params = {...params, ...baseFilters};
    // } else {
    //   params = {...params, ...SolrQueryBuilder.baseFilters()};
    // }

    if (options.sortBy) Object.assign(params, SolrQueryBuilder.facetSortBy(options.sortBy));
    if (options.searchTerm) Object.assign(params, SolrQueryBuilder.facetContains(options.searchTerm, true));
    if (options.limit !== undefined) params['facet.limit'] = options.limit.toString();
    if (options.offset !== undefined) params['facet.offset'] = options.offset.toString();

    return params;
  }

  private buildQParam(query: string, advancedQuery?: string, includePeriodicalItem: boolean = false, includePage: boolean = false, periodicalOnly = false, rootUuid: string | null = null): string {
    const parts: string[] = [];

    const hasSpecialSyntax = (input: string): boolean => {
      const specialChars = ['?', '*', 'AND', 'OR', 'NOT', '"', '~'];
      return specialChars.some(char => input.includes(char));
    };

    if (rootUuid) {
      parts.push(`root.pid:${SolrQueryBuilder.escapeSolrQuery(rootUuid)}`);
    }

    // Handle main query
    if (query?.trim()) {
      if (hasSpecialSyntax(query)) {
        const escapedQuery = query.trim();
        parts.push(`((titles.search:${escapedQuery} OR text_ocr:${escapedQuery}))`);
      } else {
        parts.push(`(${SolrQueryBuilder.buildQueryFromInput(query, SolrOperators.and, ['titles.search', 'text_ocr'])})`);
      }
    } else {
      parts.push('*:*');
    }

    // Add boosted model query for proper ranking
    const boostedModelQuery = SolrQueryBuilder.buildBoostedModelQuery(includePeriodicalItem, includePage, periodicalOnly);
    parts.push(boostedModelQuery);

    // Handle advanced query
    if (advancedQuery?.trim()) {
      let finalAdvancedQuery = '';
      if (advancedQuery.includes(SolrOperators.or)) {
        finalAdvancedQuery = advancedQuery;
      } else {
        finalAdvancedQuery = SolrUtils.removeBrackets(advancedQuery);
      }
      parts.push(`${finalAdvancedQuery}`);
    }

    return parts.length ? parts.join(' AND ') : '*:*';
  }

  /**
   * Builds a specific query for periodical children (volumes/items)
   */
  private buildPeriodicalChildrenQuery(parentPid: string, model: string, advancedQuery?: string): string {
    const baseParts = [
      `!pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)}`,
      `own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)}`,
      `(model:${model})`
    ];

    // Handle advanced query like in buildQParam
    if (advancedQuery?.trim()) {
      let finalAdvancedQuery = '';
      if (advancedQuery.includes(SolrOperators.or)) {
        finalAdvancedQuery = advancedQuery;
      } else {
        finalAdvancedQuery = SolrUtils.removeBrackets(advancedQuery);
      }
      baseParts.push(`(${finalAdvancedQuery})`);
    }

    return SolrQueryBuilder.buildBooleanQuery(baseParts);
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

  search(query: string, filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections, advancedQuery?: string,
         includePeriodicalItem = false, includePage = false): Observable<SearchResultResponse> {

    console.log('solr search')

    const simpleBaseFilters = SolrQueryBuilder.baseFilters(includePeriodicalItem, includePage);

    let paramsObject = {
      ...simpleBaseFilters,
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.facetFields(DEFAULT_FACET_FIELDS),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount)
    };

    if (includePage) {
      paramsObject = {
        ...paramsObject,
        ...SolrQueryBuilder.highlight()
      }
    }

    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery, includePeriodicalItem, includePage));
    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  searchPeriodicals(rootUuid: string, query: string, filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections, advancedQuery?: string,
                    includePeriodicalItem = false, includePage = false): Observable<SearchResultResponse> {

    console.log('solr search periodicals')

    const simpleBaseFilters = SolrQueryBuilder.pageFilter();

    let paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.facetFields(DEFAULT_PERIODICAL_FACET_FIELDS),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount),
      ...simpleBaseFilters
    };

    console.log('paramsObject', paramsObject);

    if (includePage) {
      paramsObject = {
        ...paramsObject,
        ...SolrQueryBuilder.highlight()
      }
    }

    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery, false, includePage, true, rootUuid));
    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getFacetsWithOperators(query: string, filters: string[], facetFields: string[] = DEFAULT_FACET_FIELDS, facetOperators: { [field: string]: SolrOperators } = {}, advancedQuery?: string,
                         includePeriodicalItem = false, includePage = false, rootPid: string | null = null): Observable<SearchResultResponse> {

    let baseFilters;
    if (rootPid) {
      baseFilters = SolrQueryBuilder.basePeriodicalFilters(includePeriodicalItem, includePage, rootPid);
    } else {
      baseFilters = SolrQueryBuilder.baseFilters(includePeriodicalItem, includePage);
    }

    const filtersByField = this.groupFiltersByField(filters);
    const paramsObject = {
      ...this.createFacetBaseParams({}),
      ...baseFilters
    };

    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery, includePeriodicalItem, includePage, !!rootPid, rootPid));

    this.buildFacetFieldParams(facetFields, filtersByField, facetOperators).forEach(field => {
      params = params.append('facet.field', field);
    });

    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  /**
   * Gets facets specifically for periodical children (volumes or items)
   */
  getPeriodicalChildrenFacets(
    parentPid: string,
    model: string,
    filters: string[],
    facetFields: string[] = DEFAULT_PERIODICAL_FACET_FIELDS,
    facetOperators: { [field: string]: SolrOperators } = {},
    advancedQuery?: string
  ): Observable<SearchResultResponse> {

    console.log('getPeriodicalChildrenFacets', parentPid, model);

    const query = this.buildPeriodicalChildrenQuery(parentPid, model, advancedQuery);
    const filtersByField = this.groupFiltersByField(filters);
    const paramsObject = this.createFacetBaseParams({});

    let params = this.createHttpParams(paramsObject).set('q', query);

    // Add facet fields
    this.buildFacetFieldParams(facetFields, filtersByField, facetOperators).forEach(field => {
      params = params.append('facet.field', field);
    });


    if (filters.length > 0) {
      // Add filter queries
      this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    }

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

  getSuggestionsByFacetKey(solrField: string, term: string, facetLimit = 20): Observable<string[]> {
    return this.loadFacet('*:*', [], solrField, term, true, facetLimit, 0, SolrSortFields.count, 1).pipe(
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

  getPeriodicals(): Observable<SearchDocument[]> {
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      fq: ['accessibility:public', 'level:0', `model:${DocumentTypeEnum.periodical}`],
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.sortBy(),
      ...SolrQueryBuilder.rows(100),
      ...SolrQueryBuilder.start(0)
    };
    const params = new HttpParams({ fromObject: paramsObject });
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response.docs)
    );
  }

  getBooks(): Observable<SearchDocument[]> {
    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      fq: ['accessibility:public', 'level:0', `model:${DocumentTypeEnum.monograph}`],
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.sortBy(),
      ...SolrQueryBuilder.rows(100)
    };
    const params = new HttpParams({ fromObject: paramsObject });
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response.docs)
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

  /**
   * Improved method for getting periodical volumes with facets
   */
  getPeriodicalVolumesWithFacets(
    uuid: string,
    filters: string[],
    facetOperators: Record<string, SolrOperators>,
    page: number,
    pageCount: number,
    sortBy: any,
    sortDirection: any,
    advancedQuery?: string
  ) {
    console.log('filters:', filters)
    return forkJoin({
      volumes: this.getPeriodicalVolumes(uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery),
      facets: this.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.periodicalvolume, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery),
      facetsWithoutLicenses: this.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.periodicalvolume, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery)
    });
  }

  /**
   * Improved method for getting periodical items with facets
   */
  getPeriodicalItemsWithFacets(
    uuid: string,
    filters: string[],
    facetOperators: Record<string, SolrOperators>,
    page: number,
    pageCount: number,
    sortBy: any,
    sortDirection: any,
    advancedQuery?: string
  ) {
    console.log('filters:', filters)
    return forkJoin({
      children: this.getPeriodicalItems(uuid, filters, page, pageCount, sortBy, sortDirection, advancedQuery),
      facets: this.getPeriodicalChildrenFacets(uuid, `${DocumentTypeEnum.periodicalitem} OR model:${DocumentTypeEnum.supplement} OR model:${DocumentTypeEnum.page}`, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery),
      facetsWithoutLicenses: this.getPeriodicalChildrenFacets(uuid, `${DocumentTypeEnum.periodicalitem} OR model:${DocumentTypeEnum.supplement} OR model:${DocumentTypeEnum.page}`, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery)
    });
  }

  getPeriodicalVolumes(pid: string,
                       filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 10000, sortBy: SolrSortFields = SolrSortFields.dateMin, sortDirection: SolrSortDirections = SolrSortDirections.asc,
                        advancedQuery?: string
  ): Observable<any[]> {
    const query = this.buildPeriodicalChildrenQuery(pid, DocumentTypeEnum.periodicalvolume, advancedQuery);

    let params = this.createHttpParams({
      q: query,
      fl: 'date.str, pid, accessibility, model, part.number.str,date_range_end.day,date_range_end.month,date_range_end.year,licenses,contains_licenses,licenses.facet,own_parent.pid',
      rows: pageCount,
      sort: `${sortBy} ${sortDirection}`,
      wt: 'json'
    });

    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getPeriodicalItems(
    pid: string,
    filters: string[] = [],
    page = 0,
    pageCount = 60,
    sortBy: SolrSortFields = SolrSortFields.dateMin,
    sortDirection: SolrSortDirections = SolrSortDirections.asc,
    advancedQuery?: string
  ): Observable<any[]> {
    const query = this.buildPeriodicalChildrenQuery(
      pid,
      `${DocumentTypeEnum.periodicalitem} OR model:${DocumentTypeEnum.supplement} OR model:${DocumentTypeEnum.page}`,
      advancedQuery
    );

    // Build HttpParams so we can safely add repeated `fq` keys
    let params = new HttpParams()
      .set('q', query)
      .set('fl', 'date.str, pid, accessibility,model,part.number.str,date_range_end.day,date_range_end.month,date_range_end.year,licenses,contains_licenses,licenses.facet, root.pid, own_parent.pid')
      .set('rows', '10000')
      .set('sort', 'date.min asc, part.number.sort asc, model asc, issue.type.sort asc')
      .set('wt', 'json');

    // Append each filter as its own fq param: &fq=...&fq=...
    if (filters?.length) {
      filters.forEach(fq => {
        if (fq && fq.trim()) {
          params = params.append('fq', fq.trim());
        }
      });
    }

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getChildrenByModel(parentPid: string, sort = 'date.min asc', model: string | null = null): Observable<any[]> {
    let query = `!pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)} AND own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)}`;

    if (model) {
      query += ` AND model:${model}`;
    }

    const params = {
      q: query,
      fl: 'pid,accessibility,model,title.search,licenses,contains_licenses,licenses_of_ancestors,page.type,page.number,page.placement,track.length',
      rows: '10000',
      sort
    };
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getAudioTrackMp3Url(pid: string): string {
    return `${this.API_BASE_URL}items/${pid}/audio/mp3`;
  }

  getImageThumbnailUrl(pid: string): string {
    return `${this.API_BASE_URL}items/${pid}/image/thumb`;
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
