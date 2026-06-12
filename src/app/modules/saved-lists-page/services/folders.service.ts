import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Folder, CreateFolderRequest, UpdateFolderRequest, FolderItemsRequest, FolderDetails } from '../state/folders.models';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SolrOperators, SolrSortFields, SolrSortDirections } from '../../../core/solr/solr-helpers';
import { HttpParams } from '@angular/common/http';
import { facetKeys, facetKeysEnum, mapFacetsToSearchFields } from '../../search-results-page/const/facets';
import { getOpenLicenses, getTerminalLicenses, getAfterLoginLicenses } from '../../../core/solr/solr-misc';
import { SolrQueryBuilder } from '../../../core/solr/solr-query-builder';

/**
 * Extra filter dimensions for a folder-items search, assembled by the effect
 * from the URL + CustomSearchService so FoldersService stays stateless.
 */
export interface FolderSearchFilters {
  /** Standard facet filters (facetKey:value), e.g. model:book, authors.facet:"X". */
  fqFilters?: string[];
  /** Custom-defined facet fq clauses already in Solr-field form (e.g. where-to-search). */
  customFqClauses?: string[];
  /** Licenses for the active accessibility/availability filter (OR-ed into one fq). */
  availabilityLicenses?: string[];
  /** The current user's accessible licenses — used for the "Available only"
   *  accessibility count (facet.query), independent of whether the toggle is on. */
  userLicenses?: string[];
  /** Year/date range Solr query clauses, AND-appended to q. */
  queryClauses?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class FoldersService {

  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService,
    private translateService: TranslateService
  ) {
  }

  private get API_URL(): string {
    const url = this.environmentService.getApiUrl('folders');
    if (!url) {
      console.warn('FoldersService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  getFolders(): Observable<Folder[]> {
    return this.http.get<Folder[]>(`${this.API_URL}`);
  }

  createFolder(folder: CreateFolderRequest): Observable<Folder> {
    return this.http.post<Folder>(`${this.API_URL}`, folder);
  }

  updateFolder(uuid: string, folder: UpdateFolderRequest): Observable<Folder> {
    return this.http.put<Folder>(`${this.API_URL}/${uuid}`, folder);
  }

  deleteFolder(uuid: string): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${uuid}`);
  }

  updateFolderItems(request: FolderItemsRequest): Observable<void> {
    return this.http.put<void>(`${this.API_URL}/${request.uuid}/items`, { items: request.items });
  }

  removeItemFromFolder(request: FolderItemsRequest): Observable<void> {
    return this.http.delete<void>(`${this.API_URL}/${request.uuid}/items`, {
      body: { items: request.items }
    });
  }

  getFolderDetails(uuid: string): Observable<FolderDetails> {
    return this.http.get<FolderDetails>(`${this.API_URL}/${uuid}`);
  }

  followFolder(uuid: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${uuid}/follow`, {});
  }

  unfollowFolder(uuid: string): Observable<void> {
    return this.http.post<void>(`${this.API_URL}/${uuid}/unfollow`, {});
  }

  searchFolderItems(
    itemIds: string[],
    searchQuery?: string,
    sortBy?: SolrSortFields,
    sortDirection?: SolrSortDirections,
    filters: FolderSearchFilters = {}
  ): Observable<any> {
    const searchUrl = this.environmentService.getApiUrl('search') || '';

    // An empty folder would produce `q=()`, which Solr rejects with a 500. Short-circuit
    // with an empty, Solr-shaped response so callers parse empty results + facets instead.
    if (itemIds.length === 0) {
      return of({
        response: { docs: [], numFound: 0 },
        facet_counts: { facet_fields: {}, facet_queries: {} }
      });
    }

    // Facet fields: standard set plus accessibility + license (rendered nested
    // under the accessibility block, matching the search filters panel).
    const facetFields = [...facetKeys, facetKeysEnum.accessibility];

    let params = this.buildFolderQuery(itemIds, searchQuery, filters)
      .set('rows', '1000');

    for (const field of facetFields) {
      params = params.append('facet.field', field);
    }

    if (sortBy && sortDirection) {
      params = params.set('sort', `${sortBy} ${sortDirection}`);
    }

    return this.http.get<any>(searchUrl, { params });
  }

  /**
   * Load a single facet's items scoped to a folder's items, for the "show more"
   * dialog. Mirrors searchFolderItems' folder/availability scoping but requests
   * only one facet field with pagination, sort and contains, and applies the
   * dialog's pending selection/operator using the {!ex=}/{!tag=} OR-with-selection
   * pattern (same as SolrService.loadFacetWithPendingChanges).
   */
  loadFolderFacetPage(
    itemIds: string[],
    facetKey: string,
    pendingSelection: Set<string>,
    pendingOperator: SolrOperators,
    options: { searchTerm?: string; limit: number; offset: number; sortBy: SolrSortFields },
    filters: FolderSearchFilters = {}
  ): Observable<any> {
    const searchUrl = this.environmentService.getApiUrl('search') || '';
    // Facet on the original .facet field (full values), but apply the pending
    // selection as fq on the mapped .search field — matching how applied folder
    // filters work (see buildFolderQuery's fqFilters mapping). The {!ex}/{!tag}
    // names just have to match each other, so we key them on facetKey.
    const fqField = mapFacetsToSearchFields([`${facetKey}:x`])[0]?.split(':')[0] || facetKey;

    // rows=0: the dialog only needs facet counts, not documents.
    let params = this.buildFolderQuery(itemIds, undefined, filters).set('rows', '0');

    const isOrWithSelection = pendingOperator === SolrOperators.or && pendingSelection.size > 0;
    params = params.append('facet.field', isOrWithSelection ? `{!ex=${facetKey}}${facetKey}` : facetKey);
    params = params
      .set('facet.limit', options.limit.toString())
      .set('facet.offset', options.offset.toString())
      .set('facet.sort', options.sortBy === SolrSortFields.title ? 'index' : 'count');
    if (options.searchTerm) {
      params = params.set('facet.contains', options.searchTerm).set('facet.contains.ignoreCase', 'true');
    }

    if (pendingSelection.size > 0) {
      const escaped = Array.from(pendingSelection).map(v => `"${v}"`);
      let fqParam = isOrWithSelection ? `{!tag=${facetKey}}` : '';
      fqParam += escaped.length === 1
        ? `${fqField}:${escaped[0]}`
        : `(${escaped.map(val => `${fqField}:${val}`).join(` ${pendingOperator} `)})`;
      params = params.append('fq', fqParam);
    }

    return this.http.get<any>(searchUrl, { params }).pipe(
      map(response => ({ response, facetField: facetKey }))
    );
  }

  /**
   * Builds the shared base Solr query for a folder-items search: the folder's
   * items (pid: scope) AND optional free-text/range clauses on q, the
   * accessibility facet.query counts, and the standard/custom/availability fq
   * filters. Callers add rows, facet fields and sort on top.
   */
  private buildFolderQuery(
    itemIds: string[],
    searchQuery: string | undefined,
    filters: FolderSearchFilters
  ): HttpParams {
    const pidQuery = itemIds.map(id => `pid:"${id}"`).join(' OR ');

    // Base query is the folder's items; AND any free-text term and range clauses.
    const qClauses: string[] = [`(${pidQuery})`];
    if (searchQuery && searchQuery.trim()) {
      qClauses.push(SolrQueryBuilder.buildSearchClause(searchQuery.trim()));
    }
    for (const clause of filters.queryClauses ?? []) {
      if (clause) qClauses.push(clause);
    }
    const finalQuery = qClauses.join(' AND ');

    let params = new HttpParams()
      .set('q', finalQuery)
      .set('facet', 'true')
      .set('facet.mincount', '1');

    // Accessibility facet counts come from facet.query (not facet.field), mirroring
    // SolrService.getFacetsWithOperators. The availability fq below is tagged
    // {!tag=avail} so {!ex=avail} here ignores the availability toggle while still
    // respecting any selected license filters.
    params = params.append('facet.query', '{!ex=avail}*:*');
    if (filters.userLicenses && filters.userLicenses.length > 0) {
      params = params.append('facet.query', `{!ex=avail}(${this.licenseClauses(filters.userLicenses)})`);
    }
    if (getOpenLicenses().length > 0) {
      params = params.append('facet.query', `{!ex=avail}(${this.licenseClauses(getOpenLicenses())})`);
    }
    if (getTerminalLicenses().length > 0) {
      params = params.append('facet.query', `{!ex=avail}(${this.licenseClauses(getTerminalLicenses())})`);
    }
    if (getAfterLoginLicenses().length > 0) {
      params = params.append('facet.query', `{!ex=avail}(${this.licenseClauses(getAfterLoginLicenses())})`);
    }

    // Standard facet filters (mapped to their search fields). Quote the value so
    // names containing commas/spaces (e.g. authors.search:"Férey, Caryl") don't
    // break Solr's query parser — mirrors SolrService.buildFqParams. Range
    // queries ([..]/{..}) are left unquoted.
    for (const fq of mapFacetsToSearchFields(filters.fqFilters ?? [])) {
      params = params.append('fq', this.quoteFqValue(fq));
    }

    // Custom-defined facet clauses (already in Solr-field form).
    for (const fq of filters.customFqClauses ?? []) {
      if (fq) params = params.append('fq', fq);
    }

    // Accessibility / availability: OR the active filter's licenses into one fq,
    // tagged {!tag=avail} so the accessibility facet.query counts above can
    // exclude it via {!ex=avail}.
    if (filters.availabilityLicenses && filters.availabilityLicenses.length > 0) {
      params = params.append('fq', `{!tag=avail}(${this.licenseClauses(filters.availabilityLicenses)})`);
    }

    return params;
  }

  /**
   * Wraps an `fq` value in quotes so values containing commas/spaces survive
   * Solr's query parser. Range queries ([..]/{..}) are left as-is. Mirrors the
   * escaping in SolrService.buildFqParams used by the search-results page.
   */
  /** OR-joins license values into a Solr clause, e.g. `licenses:"a" OR licenses:"b"`. */
  private licenseClauses(licenses: string[]): string {
    return licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
  }

  private quoteFqValue(fq: string): string {
    const colonIndex = fq.indexOf(':');
    if (colonIndex === -1) {
      return fq;
    }
    const field = fq.substring(0, colonIndex);
    const value = fq.substring(colonIndex + 1).trim();
    // Already quoted, or a range query — leave untouched.
    if (value.startsWith('"') || value.startsWith('[') || value.startsWith('{')) {
      return fq;
    }
    return `${field}:"${value}"`;
  }

  private readonly FAVORITES_KEY = 'my-favorite--list';

  // Known favorites folder names across all supported languages (public/i18n/*.json).
  // The backend has no favorites flag, so the folder is identified by matching its
  // stored name against any language's translation — preventing duplicates when the
  // user switches language.
  private readonly FAVORITES_NAMES_BY_LANG: Record<string, string> = {
    en: 'My favorites',
    cs: 'Moje oblíbené',
    sk: 'Moje obľúbené',
    pl: 'Moje ulubione',
  };

  /**
   * Gets the translated name for the favorites folder in the current language
   */
  getFavoritesFolderName(): string {
    return this.translateService.instant(this.FAVORITES_KEY);
  }

  /**
   * Name to display for the favorites folder, always in the current UI language.
   */
  getFavoritesDisplayName(): string {
    return this.getFavoritesFolderName();
  }

  /**
   * All known favorites folder names across supported languages, lower-cased.
   * Includes the current language's live translation to stay correct even if
   * the static list drifts from i18n content.
   */
  getAllFavoritesFolderNames(): string[] {
    const names = new Set<string>(
      Object.values(this.FAVORITES_NAMES_BY_LANG).map(n => n.toLowerCase())
    );
    const current = this.getFavoritesFolderName();
    if (current) {
      names.add(current.toLowerCase());
    }
    return [...names];
  }

  /**
   * Whether a folder is THE favorites folder, regardless of the language it was
   * created in.
   */
  isFavoritesFolder(folder: { name: string }): boolean {
    if (!folder?.name) {
      return false;
    }
    return this.getAllFavoritesFolderNames().includes(folder.name.toLowerCase());
  }

  /**
   * Sorts folders to put the favorites folder first, then rest in original order
   */
  sortFoldersWithFavoritesFirst(folders: Folder[]): Folder[] {
    if (!folders || folders.length === 0) {
      return folders;
    }

    const favoritesFolder = folders.find(folder => this.isFavoritesFolder(folder));

    if (!favoritesFolder) {
      return folders;
    }

    const otherFolders = folders.filter(folder => !this.isFavoritesFolder(folder));

    return [favoritesFolder, ...otherFolders];
  }
}
