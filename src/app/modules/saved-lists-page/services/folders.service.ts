import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { TranslateService } from '@ngx-translate/core';
import { Folder, CreateFolderRequest, UpdateFolderRequest, FolderItemsRequest, FolderDetails } from '../state/folders.models';
import { EnvironmentService } from '../../../shared/services/environment.service';
import { SolrOperators, SolrSortFields } from '../../../core/solr/solr-helpers';
import { facetKeysEnum, mapFacetsToSearchFields } from '../../search-results-page/const/facets';
import { SolrService } from '../../../core/solr/solr.service';
import { FolderSearchScope } from './folder-search-scope.service';

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
  /** Group the pages request by root.pid ("Strany v tituloch"), from ?group. */
  grouped?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FoldersService {

  constructor(
    private http: HttpClient,
    private environmentService: EnvironmentService,
    private translateService: TranslateService,
    private solrService: SolrService,
    private folderSearchScope: FolderSearchScope
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

  /**
   * Load a single facet's items scoped to the folder, for the "show more" dialog.
   * Scoping goes through the shared SolrService.loadFacet with a pidScope of the
   * folder's root pids (resolved + chunked by FolderSearchScope). Because a page
   * slice (offset/limit/sort) can't be merged across chunks server-side, each
   * chunk requests ALL of this facet's values (facet.limit=-1); we sum the
   * disjoint-chunk counts, then sort and slice client-side to reproduce Solr's
   * paging.
   */
  loadFolderFacetPage(
    itemIds: string[],
    facetKey: string,
    pendingSelection: Set<string>,
    pendingOperator: SolrOperators,
    options: { searchTerm?: string; limit: number; offset: number; sortBy: SolrSortFields },
    filters: FolderSearchFilters = {}
  ): Observable<any> {
    // Apply the pending selection as fq on the mapped .search field — matching how
    // applied folder filters work — while faceting on the original .facet field.
    const fqField = mapFacetsToSearchFields([`${facetKey}:x`])[0]?.split(':')[0] || facetKey;
    const isOrWithSelection = pendingOperator === SolrOperators.or && pendingSelection.size > 0;

    // Other-facet filters only; the dialog's own facet is represented by
    // pendingSelection (loadFacet also drops any `facetKey:`-prefixed leftovers).
    const otherFqFilters = mapFacetsToSearchFields(
      (filters.fqFilters ?? []).filter(f => !f.startsWith(facetKey + ':'))
    );

    // Clauses that don't fit loadFacet's field:value fq list are AND-ed into q:
    // range clauses, the custom-facet OR group, availability, and — for the AND
    // operator — the dialog's pending selection. With OR the selection is left
    // out so counts ignore it, the same effect as the {!ex}/{!tag} pattern.
    const qClauses: string[] = ['*:*'];
    for (const clause of filters.queryClauses ?? []) {
      if (clause) qClauses.push(clause);
    }
    const customClauses = (filters.customFqClauses ?? []).filter(fq => !!fq);
    if (customClauses.length > 0) {
      qClauses.push(`(${customClauses.join(' OR ')})`);
    }
    if (filters.availabilityLicenses && filters.availabilityLicenses.length > 0) {
      qClauses.push(`(${this.licenseClauses(filters.availabilityLicenses)})`);
    }
    if (!isOrWithSelection && pendingSelection.size > 0) {
      const escaped = Array.from(pendingSelection).map(v => `"${v}"`);
      qClauses.push(escaped.length === 1
        ? `${fqField}:${escaped[0]}`
        : `(${escaped.map(val => `${fqField}:${val}`).join(` ${pendingOperator} `)})`);
    }
    const query = qClauses.join(' AND ');

    return this.folderSearchScope.resolveScopePaths(itemIds).pipe(
      switchMap(scopePaths => {
        const chunks = this.folderSearchScope.chunk(scopePaths, FolderSearchScope.PID_BATCH_SIZE);
        if (chunks.length === 0) {
          return of({
            response: { facet_counts: { facet_fields: { [facetKey]: [] } } },
            facetField: facetKey
          });
        }

        return forkJoin(
          chunks.map(chunk =>
            this.solrService.loadFacet(
              query, otherFqFilters, facetKey,
              options.searchTerm || undefined, true, -1, 0,
              options.sortBy, 1, undefined, chunk
            )
          )
        ).pipe(
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
      })
    );
  }

  /** OR-joins license values into a Solr clause, e.g. `licenses:"a" OR licenses:"b"`. */
  private licenseClauses(licenses: string[]): string {
    return licenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
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
