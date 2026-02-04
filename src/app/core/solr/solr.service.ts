import { Injectable } from '@angular/core';
import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SolrResponseParser } from './solr-response-parser';
import { SolrQueryBuilder } from './solr-query-builder';
import { SolrOperators, SolrSortDirections, SolrSortFields } from './solr-helpers';
import { SearchResultResponse } from '../../modules/models/search-result-response';
import { FacetItem } from '../../modules/models/facet-item';
import {
  DEFAULT_FACET_FIELDS,
  DEFAULT_PERIODICAL_FACET_FIELDS,
} from '../../modules/search-results-page/const/facet-fields';
import { facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { PUBLIC_LICENSES, ONSITE_LICENSES, AFTER_LOGIN_LICENSES } from './solr-misc';
import { SEARCH_RETURN_FIELDS } from '../../modules/search-results-page/const/search-return-fields';
import { EnvironmentService } from '../../shared/services/environment.service';
import { SolrUtils } from './solr-utils';
import { DocumentTypeEnum } from '../../modules/constants/document-type';
import { SearchDocument } from '../../modules/models/search-document';
import { DocumentInfo } from '../../shared/models/document-info';
import { DisplayConfigService } from '../../shared/services/display-config.service';
import { SKIP_ERROR_INTERCEPTOR } from '../services/http-context-tokens';

@Injectable({ providedIn: 'root' })
export class SolrService {

  private IIIF_BASE_URL = 'https://iiif.digitalniknihovna.cz';

  constructor(
    private http: HttpClient,
    private env: EnvironmentService,
    private displayConfigService: DisplayConfigService
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
      const colonIndex = filter.indexOf(':');
      if (colonIndex === -1) {
        console.warn(`SolrService: Invalid filter format (missing colon): ${filter}`);
        return;
      }

      const field = filter.substring(0, colonIndex);
      const value = filter.substring(colonIndex + 1);

      if (!filtersByField.has(field)) {
        filtersByField.set(field, []);
      }
      filtersByField.get(field)?.push(value);
    });
    return filtersByField;
  }

  private createFacetBaseParams(options: any = {}, addBaseFilters = false, baseFilters: { fq: string } | null = null): Record<string, any> {
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

  private sanitizeSearchTerms(query: string): string {
    // Preserve quoted phrases
    if (query.startsWith('"') && query.endsWith('"')) {
      return query;
    }

    return query
      .replace(/[:\(\)\[\]\{\}~^\\\/;.!,]/g, ' ')  // Keep * ? " for wildcards/phrases
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Removes diacritics from a string (ASCII folding)
   */
  private removeDiacritics(str: string): string {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  private buildQParam(query: string, advancedQuery?: string, includePeriodicalItem: boolean = false, includePage: boolean = false, periodicalOnly = false, rootUuid: string | null = null, collectionUuid: string | null = null): string {
    const parts: string[] = [];

    if (rootUuid) {
      parts.push(`root.pid:${SolrQueryBuilder.escapeSolrQuery(rootUuid)}`);
    }

    if (query?.trim()) {
      const sanitizedQuery = this.sanitizeSearchTerms(query);
      const terms = sanitizedQuery.split(/\s+/).filter(t => t.length > 0);

      if (terms.length === 0) {
        parts.push('*:*');
      } else {
        // Convert terms to lowercase and create ASCII-folded versions
        const lowerTerms = terms.map(t => t.toLowerCase());
        const asciiFoldedTerms = lowerTerms.map(t => this.removeDiacritics(t));

        // Build term queries for both diacritical and ASCII-folded versions
        const buildTermQuery = (termsArray: string[], addWildcard: boolean) => {
          return termsArray.map((term, i) => {
            if (term.includes('*') || term.includes('?')) {
              return term;
            }
            return addWildcard && i === termsArray.length - 1 ? `${term}*` : term;
          }).join(' AND ');
        };

        const exactQuery = buildTermQuery(lowerTerms, false);
        const wildcardQuery = buildTermQuery(lowerTerms, true);
        const asciiFoldedWildcardQuery = buildTermQuery(asciiFoldedTerms, true);

        // Check if ASCII-folded version is different from original
        const hasDiacritics = wildcardQuery !== asciiFoldedWildcardQuery;

        if (collectionUuid) {
          // Collection search - include all searchable fields
          const queryParts = [
            `title.search:(${exactQuery})^15`,
            `title.search:(${wildcardQuery})^12`,
            `titles.search:(${wildcardQuery})^10`,
            `authors.search:(${wildcardQuery})^2`,
            `keywords.search:(${wildcardQuery})`,
            `publishers.search:(${wildcardQuery})`,
            `genres.search:(${wildcardQuery})`,
            `geographic_names.search:(${wildcardQuery})`,
            `text_ocr:(${wildcardQuery})^0.1`,
            `id_isbn:(${wildcardQuery})`,
            `shelf_locators:(${wildcardQuery})`
          ];
          if (hasDiacritics) {
            queryParts.push(
              `title.search:(${asciiFoldedWildcardQuery})^11`,
              `titles.search:(${asciiFoldedWildcardQuery})^9`,
              `authors.search:(${asciiFoldedWildcardQuery})^1.5`,
              `text_ocr:(${asciiFoldedWildcardQuery})^0.05`
            );
          }
          parts.push(`(${queryParts.join(' OR ')})`);
        } else {
          // Simple search - title and OCR fields only
          const queryParts = [
            `title.search:(${exactQuery})^3`,
            `title.search:(${wildcardQuery})^2`,
            `titles.search:(${wildcardQuery})`,
            `text_ocr:(${wildcardQuery})^0.1`
          ];
          if (hasDiacritics) {
            queryParts.push(
              `title.search:(${asciiFoldedWildcardQuery})^1.5`,
              `titles.search:(${asciiFoldedWildcardQuery})^0.8`,
              `text_ocr:(${asciiFoldedWildcardQuery})^0.05`
            );
          }
          parts.push(`(${queryParts.join(' OR ')})`);
        }
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

    // Handle collection filter as part of query (not fq)
    if (collectionUuid) {
      const modelParts: string[] = [];

      if (includePage) {
        modelParts.push('model:page');
        modelParts.push('model:article');
      }

      if (includePeriodicalItem) {
        modelParts.push('model:periodicalitem');
      }

      let collectionFilter = `in_collections.direct:"${collectionUuid}"`;

      if (modelParts.length > 0) {
        const modelQuery = modelParts.join(' OR ');
        collectionFilter = `((${collectionFilter}) OR ((${modelQuery}) AND in_collections:"${collectionUuid}"))`;
      }

      parts.push(collectionFilter);
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
      // Don't quote range queries (values starting with [ or {)
      const escaped = values.map(v => {
        const trimmed = v.trim();
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
          return trimmed; // Range query - don't quote
        }
        return `"${v}"`;
      });
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

  /**
   * Builds fq params from filter groups. Each group becomes separate fq params.
   * Within a group = OR, between groups = AND (Solr default for multiple fq params).
   */
  private buildFqParamsFromGroups(filterGroups: string[][], operators: Record<string, string> = {}): string[] {
    const fq: string[] = [];
    for (const group of filterGroups) {
      if (group.length === 0) continue;
      const grouped = this.groupFiltersByField(group);
      grouped.forEach((values, field) => {
        const op = operators[field] || SolrOperators.or;
        // Don't quote range queries (values starting with [ or {)
        const escaped = values.map(v => {
          const trimmed = v.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            return trimmed; // Range query - don't quote
          }
          return `"${v}"`;
        });
        let fqParam = op === SolrOperators.or ? `{!tag=${field}}` : '';
        fqParam += values.length === 1
          ? `${field}:${escaped[0]}`
          : `(${escaped.map(val => `${field}:${val}`).join(` ${op} `)})`;
        fq.push(fqParam);
      });
    }
    return fq;
  }

  private buildFacetFieldParams(fields: string[], filtersByField: Map<string, string[]>, operators: Record<string, string>): string[] {
    return fields.map(field => {
      const op = operators[field] || SolrOperators.or;
      const hasFilter = filtersByField.has(field) && filtersByField.get(field)!.length > 0;

      if (field === facetKeysEnum.model && filtersByField.has(facetKeysEnum.rootModel)) {
        return `{!ex=${facetKeysEnum.rootModel}}${field}`;
      }

      // Don't exclude licenses.facet from calculations - we want accurate counts
      // if (field === facetKeysEnum.license) {
      //   return field;
      // }

      return op === SolrOperators.or && hasFilter ? `{!ex=${field}}${field}` : field;
    });
  }

  search(query: string, filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections, advancedQuery?: string,
    includePeriodicalItem = false, includePage = false, facetFields: string[] = DEFAULT_FACET_FIELDS, filterGroups?: string[][], availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }): Observable<SearchResultResponse> {

    const simpleBaseFilters = SolrQueryBuilder.baseFilters(includePeriodicalItem, includePage);

    // Get fields to return: base fields + optional fields for visible columns
    const optionalFields = this.displayConfigService.getSolrFieldsForVisibleColumns();
    const fieldsToReturn = [...SEARCH_RETURN_FIELDS, ...optionalFields];

    let paramsObject = {
      ...simpleBaseFilters,
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn(fieldsToReturn),
      ...SolrQueryBuilder.facetFields(facetFields),
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

    // Use filterGroups if provided, otherwise fall back to flat filters
    if (filterGroups && filterGroups.length > 0) {
      this.buildFqParamsFromGroups(filterGroups, facetOperators).forEach(fq => params = params.append('fq', fq));
    } else {
      this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    }

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  searchPeriodicals(rootUuid: string, query: string, filters: string[] = [], facetOperators: { [field: string]: SolrOperators } = {}, page = 0, pageCount = 60, sortBy: SolrSortFields, sortDirection: SolrSortDirections, advancedQuery?: string,
    includePeriodicalItem = false, includePage = false, includeFacets = true, availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }): Observable<SearchResultResponse> {

    console.log('solr search periodicals')

    const simpleBaseFilters = SolrQueryBuilder.pageFilter();

    // Get fields to return: base fields + optional fields for visible columns
    const optionalFields = this.displayConfigService.getSolrFieldsForVisibleColumns();
    const fieldsToReturn = [...SEARCH_RETURN_FIELDS, ...optionalFields];

    let paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn(fieldsToReturn),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount),
      ...simpleBaseFilters
    };

    if (includeFacets) {
      paramsObject = {
        ...paramsObject,
        ...SolrQueryBuilder.facetFields(DEFAULT_PERIODICAL_FACET_FIELDS)
      };
    }

    console.log('paramsObject', paramsObject);

    if (includePage) {
      paramsObject = {
        ...paramsObject,
        ...SolrQueryBuilder.highlight()
      }
    }

    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery, false, includePage, true, rootUuid));
    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  searchInCollection(
    collectionUuid: string,
    query: string,
    filters: string[] = [],
    facetOperators: { [field: string]: SolrOperators } = {},
    page = 0,
    pageCount = 60,
    sortBy: SolrSortFields,
    sortDirection: SolrSortDirections,
    advancedQuery?: string,
    includePeriodicalItem = false,
    includePage = false,
    facetFields: string[] = DEFAULT_FACET_FIELDS,
    availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }
  ): Observable<SearchResultResponse> {
    // Get fields to return: base fields + optional fields for visible columns
    const optionalFields = this.displayConfigService.getSolrFieldsForVisibleColumns();
    const fieldsToReturn = [...SEARCH_RETURN_FIELDS, ...optionalFields];

    let paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      ...SolrQueryBuilder.fieldsToReturn(fieldsToReturn),
      ...SolrQueryBuilder.facetFields(facetFields),
      ...SolrQueryBuilder.sortBy(sortBy, sortDirection),
      ...SolrQueryBuilder.pagination(page, pageCount)
    };

    if (includePage) {
      paramsObject = {
        ...paramsObject,
        ...SolrQueryBuilder.highlight()
      }
    }

    let params = this.createHttpParams(paramsObject)
      .set('q', this.buildQParam(query, advancedQuery, includePeriodicalItem, includePage, false, null, collectionUuid));

    // Add other filters (collection filter is now part of q parameter)
    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getFacetsInCollection(
    collectionUuid: string,
    query: string,
    filters: string[],
    facetFields: string[] = DEFAULT_FACET_FIELDS,
    facetOperators: { [field: string]: SolrOperators } = {},
    advancedQuery?: string,
    includePeriodicalItem = false,
    includePage = false,
    availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }
  ): Observable<SearchResultResponse> {
    const filtersByField = this.groupFiltersByField(filters);

    const paramsObject = {
      ...this.createFacetBaseParams({})
    };

    let params = this.createHttpParams(paramsObject).set('q', this.buildQParam(query, advancedQuery, includePeriodicalItem, includePage, false, null, collectionUuid));

    // Collection filter is now part of q parameter

    this.buildFacetFieldParams(facetFields, filtersByField, facetOperators).forEach(field => {
      params = params.append('facet.field', field);
    });

    // Add facet.query for accessibility counts (same pattern as getFacetsWithOperators)
    // 1. "All" count - excludes availability filter (tagged with avail), respects user-selected license filters
    params = params.append('facet.query', '{!ex=avail}*:*');

    // 2. "Available only" count - query for user's accessible licenses
    if (availabilityFilter?.userLicenses && availabilityFilter.userLicenses.length > 0) {
      const licenseClauses = availabilityFilter.userLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${licenseClauses})`);
    }

    // 3. "Public" count - query for PUBLIC_LICENSES
    if (PUBLIC_LICENSES.length > 0) {
      const publicLicenseClauses = PUBLIC_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${publicLicenseClauses})`);
    }

    // 4. "Onsite" count - query for ONSITE_LICENSES
    if (ONSITE_LICENSES.length > 0) {
      const onsiteLicenseClauses = ONSITE_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${onsiteLicenseClauses})`);
    }

    // 5. "After Login" count - query for AFTER_LOGIN_LICENSES
    if (AFTER_LOGIN_LICENSES.length > 0) {
      const afterLoginLicenseClauses = AFTER_LOGIN_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${afterLoginLicenseClauses})`);
    }

    this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<SearchResultResponse>(this.API_URL, { params });
  }

  getFacetsWithOperators(query: string, filters: string[], facetFields: string[] = DEFAULT_FACET_FIELDS, facetOperators: { [field: string]: SolrOperators } = {}, advancedQuery?: string,
    includePeriodicalItem = false, includePage = false, rootPid: string | null = null, filterGroups?: string[][], availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }): Observable<SearchResultResponse> {

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

    // Always add facet.query for accessibility counts:
    // 1. "All" count - excludes availability filter (tagged with avail), respects user-selected license filters
    params = params.append('facet.query', '{!ex=avail}*:*');

    // 2. "Available only" count - query for user's accessible licenses
    if (availabilityFilter?.userLicenses && availabilityFilter.userLicenses.length > 0) {
      const licenseClauses = availabilityFilter.userLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${licenseClauses})`);
    }

    // 3. "Public" count - query for PUBLIC_LICENSES
    if (PUBLIC_LICENSES.length > 0) {
      const publicLicenseClauses = PUBLIC_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${publicLicenseClauses})`);
    }

    // 4. "Onsite" count - query for ONSITE_LICENSES
    if (ONSITE_LICENSES.length > 0) {
      const onsiteLicenseClauses = ONSITE_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${onsiteLicenseClauses})`);
    }

    // 5. "After Login" count - query for AFTER_LOGIN_LICENSES
    if (AFTER_LOGIN_LICENSES.length > 0) {
      const afterLoginLicenseClauses = AFTER_LOGIN_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${afterLoginLicenseClauses})`);
    }

    // Use filterGroups if provided, otherwise fall back to flat filters
    if (filterGroups && filterGroups.length > 0) {
      this.buildFqParamsFromGroups(filterGroups, facetOperators).forEach(fq => params = params.append('fq', fq));
    } else {
      this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    }

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

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
    advancedQuery?: string,
    availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }
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

    // Add facet.query for accessibility counts (same pattern as getFacetsWithOperators)
    // 1. "All" count - excludes availability filter (tagged with avail), respects user-selected license filters
    params = params.append('facet.query', '{!ex=avail}*:*');

    // 2. "Available only" count - query for user's accessible licenses
    if (availabilityFilter?.userLicenses && availabilityFilter.userLicenses.length > 0) {
      const licenseClauses = availabilityFilter.userLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${licenseClauses})`);
    }

    // 3. "Public" count - query for PUBLIC_LICENSES
    if (PUBLIC_LICENSES.length > 0) {
      const publicLicenseClauses = PUBLIC_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${publicLicenseClauses})`);
    }

    // 4. "Onsite" count - query for ONSITE_LICENSES
    if (ONSITE_LICENSES.length > 0) {
      const onsiteLicenseClauses = ONSITE_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${onsiteLicenseClauses})`);
    }

    // 5. "After Login" count - query for AFTER_LOGIN_LICENSES
    if (AFTER_LOGIN_LICENSES.length > 0) {
      const afterLoginLicenseClauses = AFTER_LOGIN_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('facet.query', `{!ex=avail}(${afterLoginLicenseClauses})`);
    }

    if (filters.length > 0) {
      // Add filter queries
      this.buildFqParams(filters, facetOperators).forEach(fq => params = params.append('fq', fq));
    }

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
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
    return this.loadFacet('*:* AND level:0', [], solrField, term, true, facetLimit, 0, SolrSortFields.count, 1).pipe(
      map(res => SolrResponseParser.parseFacet(res.facet_counts.facet_fields?.[solrField] || []).map(f => f.name))
    );
  }

  getAutocompleteSuggestions(term: string): Observable<string[]> {
    // const query = SolrQueryBuilder.buildQueryFromInput(term);
    const query = this.buildQParam(term);
    const paramsObject = {
      q: query,
      fl: 'pid,title.search',
      fq: ['level:0'],
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

  getCollections(query?: string, page: number = 0, pageSize: number = 10000): Observable<any> {
    const baseFilters = ['level:0', `model:${DocumentTypeEnum.collection}`];

    const paramsObject = {
      ...SolrQueryBuilder.baseParams(),
      fq: baseFilters,
      ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS),
      ...SolrQueryBuilder.sortBy(),
      ...SolrQueryBuilder.rows(pageSize),
      ...SolrQueryBuilder.start(page * pageSize),
      ...(query && query.trim() && { q: `title.search:${query}*` })
    };

    const params = new HttpParams({ fromObject: paramsObject });
    return this.http.get<any>(this.API_URL, { params });
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

  getDocumentsByPids(pids: string[]): Observable<any[]> {
    if (!pids || pids.length === 0) {
      return new Observable(obs => {
        obs.next([]);
        obs.complete();
      });
    }
    const query = `pid:(${pids.map(pid => `"${pid}"`).join(' OR ')})`;
    const params = new HttpParams({
      fromObject: {
        q: query,
        ...SolrQueryBuilder.rows(pids.length),
        ...SolrQueryBuilder.fieldsToReturn(SEARCH_RETURN_FIELDS)
      }
    });
    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
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
    advancedQuery?: string, availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }
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

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

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
    advancedQuery?: string,
    availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }
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

    this.buildFqParams(filters, {}).forEach(fq => params = params.append('fq', fq));

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      params = params.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<any>(this.API_URL, { params }).pipe(
      map(res => res.response?.docs ?? [])
    );
  }

  getChildrenByModel(parentPid: string, sort = 'date.min asc', model: string | null = null, includeFacets = false, facetFields: string[] = [], filters: string[] = [], facetOperators: Record<string, string> = {}, availabilityFilter?: { isActive: boolean, licenses: string[], userLicenses?: string[] }): Observable<any> {
    let query = `!pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)} AND own_parent.pid:${SolrQueryBuilder.escapeSolrQuery(parentPid)}`;

    if (model) {
      query += ` AND model:${model}`;
    }

    let httpParams = new HttpParams({
      fromObject: {
        q: query,
        fl: 'pid,accessibility,model,title.search,licenses,contains_licenses,licenses_of_ancestors,page.type,page.number,page.placement,track.length,root.pid,root.title,authors',
        rows: '10000',
        sort
      }
    });

    if (includeFacets && facetFields.length > 0) {
      httpParams = httpParams.set('facet', 'true');
      httpParams = httpParams.set('facet.mincount', '1');
      facetFields.forEach(field => {
        httpParams = httpParams.append('facet.field', field);
      });

      // Add facet.query for accessibility counts (same pattern as getFacetsWithOperators)
      // 1. "All" count - excludes availability filter (tagged with avail), respects user-selected license filters
      httpParams = httpParams.append('facet.query', '{!ex=avail}*:*');

      // 2. "Available only" count - query for user's accessible licenses
      if (availabilityFilter?.userLicenses && availabilityFilter.userLicenses.length > 0) {
        const licenseClauses = availabilityFilter.userLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
        httpParams = httpParams.append('facet.query', `{!ex=avail}(${licenseClauses})`);
      }

      // 3. "Public" count - query for PUBLIC_LICENSES
      if (PUBLIC_LICENSES.length > 0) {
        const publicLicenseClauses = PUBLIC_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
        httpParams = httpParams.append('facet.query', `{!ex=avail}(${publicLicenseClauses})`);
      }

      // 4. "Onsite" count - query for ONSITE_LICENSES
      if (ONSITE_LICENSES.length > 0) {
        const onsiteLicenseClauses = ONSITE_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
        httpParams = httpParams.append('facet.query', `{!ex=avail}(${onsiteLicenseClauses})`);
      }

      // 5. "After Login" count - query for AFTER_LOGIN_LICENSES
      if (AFTER_LOGIN_LICENSES.length > 0) {
        const afterLoginLicenseClauses = AFTER_LOGIN_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
        httpParams = httpParams.append('facet.query', `{!ex=avail}(${afterLoginLicenseClauses})`);
      }
    }

    // Add filter queries
    this.buildFqParams(filters, facetOperators).forEach(fq => {
      httpParams = httpParams.append('fq', fq);
    });

    // Add availability filter with tag if active
    if (availabilityFilter?.isActive && availabilityFilter.licenses.length > 0) {
      const licenseClauses = availabilityFilter.licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
      httpParams = httpParams.append('fq', `{!tag=avail}(${licenseClauses})`);
    }

    return this.http.get<any>(this.API_URL, { params: httpParams }).pipe(
      map(res => {
        if (includeFacets) {
          // Return full response with both docs and facets
          return {
            docs: res.response?.docs ?? [],
            facets: res.facet_counts?.facet_fields ?? {},
            facetQueries: res.facet_counts?.facet_queries ?? {},
            numFound: res.response?.numFound ?? 0
          };
        }
        // Return just docs for backward compatibility
        return res.response?.docs ?? [];
      })
    );
  }

  getAudioTrackMp3Url(pid: string): string {
    return `${this.API_BASE_URL}items/${pid}/audio/mp3`;
  }

  getImageThumbnailUrl(pid: string): string {
    return `${this.API_BASE_URL}items/${pid}/image/thumb`;
  }

  /**
   * Gets page/item info from Kramerius API
   * @param uuid - Page/item identifier
   * @returns Observable with page info including available data formats and licenses
   */
  getPageInfo(uuid: string): Observable<DocumentInfo> {
    const url = `${this.API_BASE_URL}items/${uuid}/info`;
    return this.http.get<DocumentInfo>(url, {
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    });
  }

  /**
   * Searches within a specific document's OCR text and returns highlighted results
   * @param parentPid - Parent document PID
   * @param searchTerm - Search term (supports wildcards like "text*")
   * @param rows - Number of results to return (default: 20)
   * @returns Observable with search results including highlighting information
   */
  searchInDocument(
    parentPid: string,
    searchTerm: string,
    rows: number = 300,
    forAutocomplete: boolean = false,
    caseSensitive: boolean = false,
  ): Observable<any> {
    const ocrSearchTerm = searchTerm.includes('*') ? searchTerm : `${searchTerm}*`;

    const paramsObject = {
      fl: 'pid,root.pid',
      hl: 'true',
      q: '',
      'hl.fl': 'text_ocr',
      'hl.fragsize': forAutocomplete ? '1' : '120',
      'hl.method': 'original',
      'hl.simple.post': forAutocomplete ? '<<' : '</strong>',
      'hl.simple.pre': forAutocomplete ? '>>' : '<strong>',
      'hl.snippets': forAutocomplete ? '10' : '1',
      fq: `(own_parent.pid:"${parentPid}") AND model:page`,
      rows: rows.toString(),
      wt: 'json'
    };

    if (caseSensitive) {
      paramsObject['q'] = `text_ocr.exact:${ocrSearchTerm}`;
    } else {
      paramsObject['q'] = `text_ocr:${ocrSearchTerm}`;
    }

    const params = this.createHttpParams(paramsObject);
    return this.http.get<any>(this.API_URL, { params });
  }

  /**
   * Gets autocomplete suggestions for in-document search
   * @param parentPid - Parent document PID
   * @param searchTerm - Partial search term
   * @param rows - Number of suggestions to return (default: 10)
   * @returns Observable with array of suggestion objects containing pid and highlighted text
   */
  getInDocumentSuggestions(parentPid: string, searchTerm: string, rows: number = 10): Observable<Array<{ pid: string, highlights: string[] }>> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return this.searchInDocument(parentPid, searchTerm, rows, true).pipe(
      map(response => {
        const results: Array<{ pid: string, highlights: string[] }> = [];

        if (response.highlighting) {
          Object.entries(response.highlighting).forEach(([pid, highlightData]: [string, any]) => {
            if (highlightData.text_ocr && highlightData.text_ocr.length > 0) {
              results.push({
                pid: pid,
                highlights: highlightData.text_ocr
              });
            }
          });
        }

        return results;
      })
    );
  }

  /**
   * Gets full search results with highlighted snippets for displaying in search results list
   * @param parentPid - Parent document PID
   * @param searchTerm - Search term
   * @returns Observable with array of search results including highlighted text snippets
   */
  getInDocumentSearchResults(parentPid: string, searchTerm: string, caseSensitive = false): Observable<Array<{ pid: string, highlightedText: string }>> {
    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Observable(observer => {
        observer.next([]);
        observer.complete();
      });
    }

    return this.searchInDocument(parentPid, searchTerm, 300, false, caseSensitive).pipe(
      map(response => {
        const results: Array<{ pid: string, highlightedText: string }> = [];

        if (response.highlighting) {
          Object.entries(response.highlighting).forEach(([pid, highlightData]: [string, any]) => {
            if (highlightData.text_ocr && highlightData.text_ocr.length > 0) {
              results.push({
                pid: pid,
                highlightedText: highlightData.text_ocr[0] // Get first snippet
              });
            }
          });
        }

        return results;
      })
    );
  }

  private addFilterQueries(params: HttpParams, filters: string[], operators: Record<string, string> = {}): HttpParams {
    this.buildFqParams(filters, operators).forEach(fq => params = params.append('fq', fq));
    return params;
  }

  getIiifBaseUrl(uuid: string): string {
    let baseUrl = this.env.getPureApiUrl();
    return baseUrl + 'search/iiif/' + uuid;
  }

  imageManifest(url: string): string {
    return `${url}/info.json`;
  }

  getIiifPresentationUrl(uuid: string): string {
    return `${this.IIIF_BASE_URL}/${this.env.getKrameriusId()}/${uuid}`;
  }
}
