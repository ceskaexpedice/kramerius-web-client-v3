import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
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

    // The Solr endpoint only accepts GET, so the whole query (all `pid:` clauses
    // plus the facet payload) must fit in the URL. A large folder + 16 facet
    // fields + 4 facet.query clauses overflows the server's URI/header limit and
    // the request is rejected. So we batch the PIDs into chunks (matching the old
    // client) and merge the responses client-side. Counts sum correctly because
    // the chunks are disjoint sets of items.
    const requests = this.chunk(itemIds, FoldersService.PID_BATCH_SIZE).map(chunkIds => {
      let params = this.buildFolderQuery(chunkIds, searchQuery, filters)
        .set('rows', '1000');

      for (const field of facetFields) {
        // Exclude the where-to-search fq from the model facet so its per-category
        // counts (titles/page/article/supplement) stay stable after a category is
        // selected — Solr returns these under the plain "model" key.
        const facetField = field === facetKeysEnum.model ? `{!ex=wts}${field}` : field;
        params = params.append('facet.field', facetField);
      }

      if (sortBy && sortDirection) {
        params = params.set('sort', `${sortBy} ${sortDirection}`);
      }

      return this.http.get<any>(searchUrl, { params });
    });

    return forkJoin(requests).pipe(
      map(responses => this.mergeSearchResponses(responses, sortBy, sortDirection))
    );
  }

  /**
   * Max number of `pid:` clauses per Solr request. The endpoint is GET-only, so
   * the URL (PIDs + facet payload) must stay under the server's URI/header limit;
   * batching at this size keeps each request well within it. Mirrors the old
   * client's chunk size.
   */
  private static readonly PID_BATCH_SIZE = 50;

  /** Splits an array into consecutive chunks of at most `size`. */
  private chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Merges the per-chunk Solr search responses into a single response of the same
   * shape the effect expects. Chunks are disjoint item sets, so docs/highlighting
   * concatenate and numFound / facet field counts / facet.query counts sum. Docs
   * are re-sorted across chunks since each chunk only sorted within itself.
   */
  private mergeSearchResponses(
    responses: any[],
    sortBy?: SolrSortFields,
    sortDirection?: SolrSortDirections
  ): any {
    const docs: any[] = [];
    let numFound = 0;
    const highlighting: Record<string, any> = {};
    const facetFieldCounts: Record<string, Map<string, number>> = {};
    const facetQueryCounts: Record<string, number> = {};

    for (const response of responses) {
      docs.push(...(response?.response?.docs ?? []));
      numFound += response?.response?.numFound ?? 0;
      Object.assign(highlighting, response?.highlighting ?? {});

      // facet_fields: Solr's flat [name, count, name, count, ...] arrays. Sum per name.
      const facetFields = response?.facet_counts?.facet_fields ?? {};
      for (const [field, flat] of Object.entries<any[]>(facetFields)) {
        const counts = facetFieldCounts[field] ??= new Map<string, number>();
        for (let i = 0; i + 1 < flat.length; i += 2) {
          const name = flat[i];
          const count = flat[i + 1] ?? 0;
          counts.set(name, (counts.get(name) ?? 0) + count);
        }
      }

      // facet_queries: { queryString: count }. Sum per query string.
      const facetQueries = response?.facet_counts?.facet_queries ?? {};
      for (const [queryStr, count] of Object.entries<number>(facetQueries)) {
        facetQueryCounts[queryStr] = (facetQueryCounts[queryStr] ?? 0) + count;
      }
    }

    if (sortBy && sortDirection) {
      const dir = sortDirection === SolrSortDirections.desc ? -1 : 1;
      docs.sort((a, b) => {
        const av = a?.[sortBy];
        const bv = b?.[sortBy];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        return av < bv ? -dir : av > bv ? dir : 0;
      });
    }

    // Rebuild Solr's flat facet_fields arrays from the summed counts.
    const mergedFacetFields: Record<string, any[]> = {};
    for (const [field, counts] of Object.entries(facetFieldCounts)) {
      const flat: any[] = [];
      counts.forEach((count, name) => flat.push(name, count));
      mergedFacetFields[field] = flat;
    }

    return {
      response: { docs, numFound },
      highlighting,
      facet_counts: {
        facet_fields: mergedFacetFields,
        facet_queries: facetQueryCounts
      }
    };
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

    const isOrWithSelection = pendingOperator === SolrOperators.or && pendingSelection.size > 0;

    // GET-only endpoint, so we batch PIDs the same way searchFolderItems does (see
    // PID_BATCH_SIZE). Because the page slice (offset/limit/sort) can't be merged
    // across chunks server-side, each chunk requests ALL of this facet's values
    // (facet.limit=-1, no offset); we sum disjoint-chunk counts, then sort and
    // slice the merged values to reproduce Solr's paging client-side.
    const requests = this.chunk(itemIds, FoldersService.PID_BATCH_SIZE).map(chunkIds => {
      // rows=0: the dialog only needs facet counts, not documents.
      let params = this.buildFolderQuery(chunkIds, undefined, filters).set('rows', '0');

      params = params.append('facet.field', isOrWithSelection ? `{!ex=${facetKey}}${facetKey}` : facetKey);
      params = params.set('facet.limit', '-1');
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

      return this.http.get<any>(searchUrl, { params });
    });

    return forkJoin(requests).pipe(
      map(responses => {
        // Sum each value's count across the disjoint chunks.
        const counts = new Map<string, number>();
        for (const response of responses) {
          const flat: any[] = response?.facet_counts?.facet_fields?.[facetKey] ?? [];
          for (let i = 0; i + 1 < flat.length; i += 2) {
            const name = flat[i];
            counts.set(name, (counts.get(name) ?? 0) + (flat[i + 1] ?? 0));
          }
        }

        // Sort to match the requested facet.sort, then page with offset/limit.
        const entries = Array.from(counts.entries());
        if (options.sortBy === SolrSortFields.title) {
          entries.sort((a, b) => a[0].localeCompare(b[0]));
        } else {
          entries.sort((a, b) => b[1] - a[1]);
        }
        const paged = entries.slice(options.offset, options.offset + options.limit);

        // Re-encode as Solr's flat [name, count, ...] array under the same shape
        // the caller parses with SolrResponseParser.parseFacet.
        const flat: any[] = [];
        paged.forEach(([name, count]) => flat.push(name, count));

        return {
          response: { facet_counts: { facet_fields: { [facetKey]: flat } } },
          facetField: facetKey
        };
      })
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

    // Custom-defined facet clauses (already in Solr-field form). These are OR-ed
    // into a single fq — mirroring the search-results page, where custom filters
    // form one group ("OR within the group, AND between groups"). The
    // where-to-search "titles" option expands to several model: clauses
    // (model:monograph OR model:periodical OR ...), so appending them as separate
    // fq params would AND them and match nothing. Tagged {!tag=wts} so the model
    // facet (requested as {!ex=wts}model) reports unfiltered counts — the
    // where-to-search toggle needs every category's count to stay visible even
    // after a category is selected.
    const customClauses = (filters.customFqClauses ?? []).filter(fq => !!fq);
    if (customClauses.length > 0) {
      params = params.append('fq', `{!tag=wts}(${customClauses.join(' OR ')})`);
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
