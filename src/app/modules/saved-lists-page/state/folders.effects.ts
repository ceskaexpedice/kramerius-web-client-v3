import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, combineLatest, forkJoin } from 'rxjs';
import { catchError, map, switchMap, mergeMap, tap, filter, take, withLatestFrom } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';
import { FoldersService } from '../services/folders.service';
import { FolderSearchFiltersBuilder } from '../services/folder-search-filters.builder';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { QueryParamsService } from '../../../core/services/QueryParamsManager';
import { FolderItemsService } from '../services/folder-items.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { SolrService } from '../../../core/solr/solr.service';
import { SolrSortFields, SolrSortDirections } from '../../../core/solr/solr-helpers';
import { FolderSearchScope } from '../services/folder-search-scope.service';
import { parseSolrSearchResponse, getTotalCountFromResponse } from '../../search-results-page/state/parse-search-results';
import { facetKeys, facetKeysEnum, mapFacetsToSearchFields, mapOperatorsToSearchFields } from '../../search-results-page/const/facets';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
import { appendToAdvancedQuery } from '../../../shared/utils/date-range-query';
import { UserService } from '../../../shared/services/user.service';
import * as FoldersActions from './folders.actions';
import * as FoldersSelectors from './folders.selectors';
import * as AuthActions from '../../../core/auth/store/auth.actions';
import {APP_ROUTES_ENUM} from '../../../app.routes';

@Injectable()
export class FoldersEffects {

  loadFolders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFolders),
      switchMap(() =>
        this.foldersService.getFolders().pipe(
          map(folders => FoldersActions.loadFoldersSuccess({ folders })),
          catchError(error => of(FoldersActions.loadFoldersFailure({ error: error.message })))
        )
      )
    )
  );

  followFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.followFolder),
      switchMap(({ uuid }) =>
        this.foldersService.followFolder(uuid).pipe(
          map(() => FoldersActions.followFolderSuccess({ uuid })),
          catchError(error => of(FoldersActions.followFolderFailure({ error: error.message })))
        )
      )
    )
  );

  followFolderReload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.followFolderSuccess),
      map(() => FoldersActions.loadFolders())
    )
  );

  unfollowFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.unfollowFolder),
      switchMap(({ uuid }) =>
        this.foldersService.unfollowFolder(uuid).pipe(
          map(() => FoldersActions.unfollowFolderSuccess({ uuid })),
          catchError(error => of(FoldersActions.unfollowFolderFailure({ error: error.message })))
        )
      )
    )
  );

  unfollowFolderReload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.unfollowFolderSuccess),
      map(() => FoldersActions.loadFolders())
    )
  );

  unfollowFolderNavigate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.unfollowFolderSuccess),
      tap(() => this.router.navigate([`/${APP_ROUTES_ENUM.SAVED_LISTS}`]))
    ),
    { dispatch: false }
  );

  // Copy a shared folder into the user's own library: create a new folder, then
  // add a copy of all the source items to it.
  copyFolderToLibrary$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.copyFolderToLibrary),
      switchMap(({ name, items }) =>
        this.foldersService.createFolder({ name }).pipe(
          switchMap(folder =>
            (items.length
              ? this.foldersService.updateFolderItems({ uuid: folder.uuid, items })
              : of(void 0)
            ).pipe(map(() => FoldersActions.copyFolderToLibrarySuccess({ folder })))
          ),
          catchError(error => of(FoldersActions.copyFolderToLibraryFailure({ error: error.message })))
        )
      )
    )
  );

  copyFolderToLibraryReload$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.copyFolderToLibrarySuccess),
      map(() => FoldersActions.loadFolders())
    )
  );

  createFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.createFolder),
      switchMap(action =>
        this.foldersService.createFolder(action.folder).pipe(
          map(folder => FoldersActions.createFolderSuccess({ folder, suppressToast: action.suppressToast })),
          catchError(error => of(FoldersActions.createFolderFailure({ error: error.message })))
        )
      )
    )
  );

  updateFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.updateFolder),
      switchMap(action =>
        this.foldersService.updateFolder(action.uuid, action.folder).pipe(
          map(folder => FoldersActions.updateFolderSuccess({ folder })),
          catchError(error => of(FoldersActions.updateFolderFailure({ error: error.message })))
        )
      )
    )
  );

  deleteFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.deleteFolder),
      switchMap(action =>
        this.foldersService.deleteFolder(action.uuid).pipe(
          map(() => FoldersActions.deleteFolderSuccess({ uuid: action.uuid })),
          catchError(error => of(FoldersActions.deleteFolderFailure({ error: error.message })))
        )
      )
    )
  );

  updateFolderItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.updateFolderItems),
      mergeMap(action =>
        this.foldersService.updateFolderItems(action.request).pipe(
          map(() => FoldersActions.updateFolderItemsSuccess({
            uuid: action.request.uuid,
            itemsCount: action.request.items.length,
            items: action.request.items,
            suppressToast: action.suppressToast
          })),
          catchError(error => of(FoldersActions.updateFolderItemsFailure({ error: error.message })))
        )
      )
    )
  );

  removeItemFromFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.removeItemFromFolder),
      mergeMap(action =>
        this.foldersService.removeItemFromFolder(action.request).pipe(
          map(() => FoldersActions.removeItemFromFolderSuccess({
            uuid: action.request.uuid,
            itemsCount: action.request.items.length,
            items: action.request.items
          })),
          catchError(error => of(FoldersActions.removeItemFromFolderFailure({ error: error.message })))
        )
      )
    )
  );

  showErrorToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FoldersActions.loadFoldersFailure,
        FoldersActions.createFolderFailure,
        FoldersActions.updateFolderFailure,
        FoldersActions.deleteFolderFailure,
        FoldersActions.updateFolderItemsFailure,
        FoldersActions.removeItemFromFolderFailure,
        FoldersActions.loadFolderDetailsFailure,
        FoldersActions.loadFolderSearchResultsFailure
      ),
      tap(action => {
        // Don't show toast for auth failures - they're handled by the interceptor
        if (!action.error.includes('401') && !action.error.includes('Unauthorized')) {
          this.toastService.show(action.error);
        }
      })
    ), { dispatch: false }
  );

  showSuccessToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FoldersActions.createFolderSuccess,
        FoldersActions.updateFolderSuccess,
        FoldersActions.deleteFolderSuccess,
        FoldersActions.updateFolderItemsSuccess,
        FoldersActions.removeItemFromFolderSuccess
      ),
      tap(action => {
        if (action.type === FoldersActions.createFolderSuccess.type) {
          // Popup-driven adds suppress this toast; they show their own feedback.
          if (!action.suppressToast) {
            this.toastService.show(this.translateService.instant('folders.messages.created'));
          }
        } else if (action.type === FoldersActions.updateFolderSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.updated'));
        } else if (action.type === FoldersActions.deleteFolderSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.deleted'));
        } else if (action.type === FoldersActions.updateFolderItemsSuccess.type) {
          // Popup-driven adds suppress this toast; they show their own feedback.
          if (!action.suppressToast) {
            this.toastService.show(this.translateService.instant('folders.messages.items-updated'));
          }
        } else if (action.type === FoldersActions.removeItemFromFolderSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.items-removed'));
        }
      })
    ), { dispatch: false }
  );

  loadFolderDetails$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFolderDetails),
      switchMap(action =>
        this.foldersService.getFolderDetails(action.uuid).pipe(
          switchMap(folderDetails => [
            FoldersActions.loadFolderDetailsSuccess({ folderDetails }),
            FoldersActions.loadFolderSearchResults({
              itemIds: folderDetails.items.flat().map(item => item.id),
              grouped: this.folderSearchFiltersBuilder.build().grouped,
            })
          ]),
          catchError(error => of(FoldersActions.loadFolderDetailsFailure({ error: error.message })))
        )
      )
    )
  );

  loadFolderSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFolderSearchResults),
      switchMap(action => {
        const ctx = this.folderRequestContext();
        const query = this.urlSearchQuery();

        // No text term: the folder shows exactly the saved items (`pid:"..." OR ...`),
        // and facet/range/availability filters narrow that exact set — a filter must
        // never widen it. Only a fulltext search broadens the scope to each item's
        // own subtree (`pid_paths:<own_pid_path>*`), matching the old client's
        // ?folder= search (find the term inside the saved titles).
        const exactScope = !query.trim();
        const scope$ = exactScope
          ? of(action.itemIds)
          : this.folderSearchScope.resolveScopePaths(action.itemIds);

        return scope$.pipe(
          switchMap(scopePaths => {
            const chunks = this.folderSearchScope.chunk(scopePaths, FolderSearchScope.PID_BATCH_SIZE);
            if (chunks.length === 0) {
              // Empty folder: nothing to scope to — report empty results directly
              // (forkJoin over no sources would complete without emitting).
              return of(FoldersActions.loadFolderSearchResultsSuccess({ results: [], totalCount: 0, facets: {} }));
            }

            // Titles request: non-page docs, never grouped. Paged via ?page/?pageSize
            // like the main search (start/rows per chunk). With multiple chunks the
            // merged window can exceed pageSize, so the results are sliced below —
            // per-chunk ordering is exact; cross-chunk ordering (>50 roots) is
            // approximate, as it already was for the unpaged fetch.
            const { start, pageSize } = this.urlPaging();
            const titles$ = forkJoin(
              chunks.map(chunk =>
                this.solrService.search(
                  query, ctx.fqFilters, ctx.facetOperators, start, pageSize,
                  this.storeSortBy(), this.storeSortDirection(),
                  ctx.advancedQuery, ctx.includePeriodicalItem, false, [], undefined, ctx.availabilityFilter,
                  true, true, false, chunk, exactScope
                )
              )
            ).pipe(map(resps => this.folderSearchScope.mergeResponses(resps)));

            // Facets request (all fields), also scoped. Include pages when a text
            // term is active (same condition that fires the pages-only request) so
            // the model facet carries a `page` bucket — that's what makes the
            // where-to-search toggle's grouped/ungrouped page options appear.
            const includePageInFacets = this.shouldIncludePages();
            // In the grouped pages scope ("Strany v tituloch") the result list
            // shows one row per title (ngroups), so facet counts — including the
            // accessibility {!ex=avail}*:* "All" count — must be grouped the same
            // way, or they'd count the individual page hits instead.
            const groupedFacets = !!action.grouped && includePageInFacets;
            const facets$ = forkJoin(
              chunks.map(chunk =>
                this.solrService.getFacetsWithOperators(
                  query, ctx.fqFilters, this.folderFacetFields(), ctx.facetOperators,
                  ctx.advancedQuery, ctx.includePeriodicalItem, includePageInFacets, null, undefined,
                  ctx.availabilityFilter, groupedFacets, chunk, exactScope
                )
              )
            ).pipe(map(resps => this.folderSearchScope.mergeResponses(resps)));

            return forkJoin({ titlesRes: titles$, facetsRes: facets$ }).pipe(
              map(({ titlesRes, facetsRes }) => {
                const { results: allResults } = parseSolrSearchResponse(titlesRes, query);
                // Multi-chunk merges can return up to chunks×pageSize docs — cap the
                // window so the paginator page size holds.
                const results = allResults.slice(0, pageSize);
                const totalCount = getTotalCountFromResponse(titlesRes);
                const facets = handleFacetsWithOperators(
                  (facetsRes as any).facet_counts?.facet_fields ?? {},
                  (facetsRes as any).facet_counts?.facet_fields ?? {},
                  this.queryParamsService.getOperators(this.urlParams()),
                  {},
                  this.userService.licenses,
                  totalCount,
                  ctx.fqFilters,
                  (facetsRes as any).facet_counts?.facet_queries,
                  this.userService.isLoggedIn
                );
                return FoldersActions.loadFolderSearchResultsSuccess({ results, totalCount, facets });
              }),
              catchError(error => of(FoldersActions.loadFolderSearchResultsFailure({ error: error.message })))
            );
          })
        );
      })
    )
  );

  triggerFolderPageSearchAfterMain$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFolderSearchResultsSuccess),
      withLatestFrom(this.store.select(FoldersSelectors.selectLastFolderSearchPayload)),
      map(([{ results, totalCount }, payload]) => {
        if (!payload || !this.shouldIncludePages()) {
          return FoldersActions.loadFolderPageSearchResultsSuccess({ results: [], totalCount: 0 });
        }
        // Same spill math as the main search (triggerPageSearchAfterMain$):
        // pages fill the remainder of the current paginator window after
        // titles. For window [start, start+pageSize): the pages slice begins
        // where the window extends past titlesTotal, sized to what titles
        // didn't fill. Runs even when pagesNeeded is 0 (rows=0) so the pages
        // numFound still feeds the combined paginator total.
        const { start, pageSize } = this.urlPaging();
        const titlesShown = results.length;
        const pagesNeeded = Math.max(0, pageSize - titlesShown);
        const pagesStart = Math.max(0, start - totalCount);

        return FoldersActions.loadFolderPageSearchResults({
          itemIds: payload.itemIds,
          // Read the term from the URL like the titles/facets requests do —
          // payload.query comes from store state that the URL-driven search
          // never syncs, so it would run the pages request with q=*:* and
          // count every page in scope instead of the matching ones.
          query: this.urlSearchQuery(),
          filters: payload.filters,
          sortBy: payload.sortBy,
          sortDirection: payload.sortDirection,
          grouped: payload.grouped,
          page: pagesStart,
          pageCount: pagesNeeded,
        });
      })
    )
  );

  loadFolderPageSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFolderPageSearchResults),
      switchMap(action => {
        // Note: pageCount 0 still runs (rows=0) — the pages numFound must feed the
        // combined paginator total even when titles filled the whole window.
        const ctx = this.folderRequestContext();
        // Constrain to page-level docs, keeping the active filters as their own
        // group — same as the main search's pages-only effect. (When filterGroups
        // are set, SolrService ignores the flat filters, so the active filters
        // MUST ride along as a group or the pages request loses all filtering —
        // e.g. whereToSearch:titles would still return pages.)
        const pageOnlyGroup = ['model:page'];
        const effectiveFilterGroups = ctx.fqFilters.length > 0
          ? [ctx.fqFilters, pageOnlyGroup]
          : [pageOnlyGroup];

        return this.folderSearchScope.resolveScopePaths(action.itemIds).pipe(
          switchMap(scopePaths => {
            const chunks = this.folderSearchScope.chunk(scopePaths, FolderSearchScope.PID_BATCH_SIZE);
            if (chunks.length === 0) {
              return of(FoldersActions.loadFolderPageSearchResultsSuccess({ results: [], totalCount: 0 }));
            }
            return forkJoin(
              chunks.map(chunk =>
                this.solrService.search(
                  action.query, ctx.fqFilters, ctx.facetOperators, action.page, action.pageCount,
                  action.sortBy, action.sortDirection,
                  ctx.advancedQuery, ctx.includePeriodicalItem, true, [], effectiveFilterGroups, ctx.availabilityFilter,
                  false, false, !!action.grouped, chunk
                )
              )
            ).pipe(
              map(resps => this.folderSearchScope.mergeResponses(resps)),
              map(merged => {
                const { results: allResults } = parseSolrSearchResponse(merged, action.query);
                // Multi-chunk merges can exceed the requested window — cap it.
                const results = allResults.slice(0, action.pageCount);
                const totalCount = getTotalCountFromResponse(merged);
                return FoldersActions.loadFolderPageSearchResultsSuccess({ results, totalCount });
              }),
              catchError(error => of(FoldersActions.loadFolderPageSearchResultsFailure({ error: error.message })))
            );
          })
        );
      })
    )
  );

  searchFolders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.searchFolders),
      switchMap(() =>
        this.store.select(FoldersSelectors.selectFolderDetails).pipe(
          take(1),
          filter(folderDetails => !!folderDetails),
          map(folderDetails => FoldersActions.loadFolderSearchResults({
            itemIds: folderDetails!.items.flat().map(item => item.id),
            grouped: this.folderSearchFiltersBuilder.build().grouped,
          }))
        )
      )
    )
  );

  loadFirstFolderOnInit$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFirstFolderOnInit),
      switchMap(() =>
        this.store.select(FoldersSelectors.selectAllFolders).pipe(
          filter(folders => folders.length > 0),
          take(1),
          switchMap(folders => {
            const currentUrl = this.router.url;
            const folderUuidFromUrl = this.extractFolderUuidFromUrl(currentUrl);

            let targetFolder;
            if (folderUuidFromUrl) {
              // If URL contains folder UUID, try to find and load that specific folder
              targetFolder = folders.find(f => f.uuid === folderUuidFromUrl);
              if (targetFolder) {
                return [
                  FoldersActions.selectFolder({ folder: targetFolder }),
                  FoldersActions.loadFolderDetails({ uuid: targetFolder.uuid })
                ];
              }
            }

            // Fallback: load first folder and update URL
            const firstFolder = folders[0];
            this.router.navigate([`/${APP_ROUTES_ENUM.SAVED_LISTS}`, firstFolder.uuid]);
            return [
              FoldersActions.selectFolder({ folder: firstFolder }),
              FoldersActions.loadFolderDetails({ uuid: firstFolder.uuid })
            ];
          })
        )
      )
    )
  );

  // Load folders when user successfully authenticates
  loadFoldersOnAuth$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        AuthActions.loginSuccess,
        AuthActions.exchangeCodeForTokenSuccess,
        AuthActions.refreshTokenSuccess
      ),
      switchMap(() => {
        // First try to load folder items from cache
        const cachedMapping = this.folderItemsService.loadCacheFromStorage();
        if (cachedMapping) {
          // Cache is valid, load folders and use cached items
          return [
            FoldersActions.loadFolders(),
            FoldersActions.loadAllFolderItemsSuccess({ folderItemsMapping: cachedMapping })
          ];
        } else {
          // No cache, load folders then items
          return [FoldersActions.loadFolders()];
        }
      })
    )
  );

  // Load folder items after folders are successfully loaded (only if no cache)
  loadFolderItemsAfterFoldersLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFoldersSuccess),
      switchMap(() => {
        // Check if we already have cached data
        return this.store.select(FoldersSelectors.selectFolderItemsMapping).pipe(
          take(1),
          switchMap(currentMapping => {
            if (currentMapping.size === 0) {
              // No cached data, load from API
              return [FoldersActions.loadAllFolderItems()];
            }
            // Already have data, don't reload
            return [];
          })
        );
      })
    )
  );

  // Load all folder items using getFolderDetails for each folder
  loadAllFolderItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadAllFolderItems),
      switchMap(() =>
        // Get current folders from state
        this.store.select(FoldersSelectors.selectAllFolders).pipe(
          take(1),
          switchMap(folders => {
            if (folders.length === 0) {
              // No folders, return empty mapping
              return of(FoldersActions.loadAllFolderItemsSuccess({
                folderItemsMapping: new Map<string, Set<string>>()
              }));
            }

            // Load details for each folder in parallel
            const folderDetailsRequests = folders.map(folder =>
              this.foldersService.getFolderDetails(folder.uuid).pipe(
                map(folderDetails => ({
                  folderId: folder.uuid,
                  items: folderDetails.items.flat().map(item => item.id)
                })),
                catchError(error => {
                  console.error(`Failed to load items for folder ${folder.uuid}:`, error);
                  return of({ folderId: folder.uuid, items: [] });
                })
              )
            );

            // Combine all requests
            return combineLatest(folderDetailsRequests).pipe(
              map(folderItemsData => {
                // Convert to Map<string, Set<string>>
                const folderItemsMapping = new Map<string, Set<string>>();
                folderItemsData.forEach(({ folderId, items }) => {
                  folderItemsMapping.set(folderId, new Set(items));
                });
                return FoldersActions.loadAllFolderItemsSuccess({ folderItemsMapping });
              }),
              catchError(error => of(FoldersActions.loadAllFolderItemsFailure({ error: error.message })))
            );
          })
        )
      )
    )
  );

  // Reload folder items mapping only when folders are created or deleted
  // Item additions/removals are handled optimistically in the reducer
  reloadFolderItemsOnUpdate$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FoldersActions.createFolderSuccess,
        FoldersActions.deleteFolderSuccess
      ),
      switchMap(() => [FoldersActions.loadAllFolderItems()])
    )
  );


  // Save cache to localStorage when mapping updates
  saveCacheToStorage$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FoldersActions.loadAllFolderItemsSuccess,
        FoldersActions.updateFolderItemsSuccess,
        FoldersActions.removeItemFromFolderSuccess
      ),
      switchMap(() =>
        // Get the current mapping from state and save it
        this.store.select(FoldersSelectors.selectFolderItemsMapping).pipe(
          take(1),
          tap(mapping => {
            this.folderItemsService.saveCacheToStorage(mapping);
          })
        )
      )
    ), { dispatch: false }
  );

  // Auto-select first folder when active folder is deleted
  autoSelectFirstFolderOnDelete$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.deleteFolderSuccess),
      switchMap(action =>
        this.store.select(FoldersSelectors.selectFolderDetails).pipe(
          take(1),
          switchMap(currentFolderDetails => {
            // Check if the deleted folder was the currently active folder
            const wasActiveFolder = currentFolderDetails?.uuid === action.uuid;

            if (wasActiveFolder) {
              // Get all remaining folders and select the first one
              return this.store.select(FoldersSelectors.selectAllFolders).pipe(
                take(1),
                switchMap(folders => {
                  if (folders.length > 0) {
                    const firstFolder = folders[0];
                    // Navigate to the first folder and load its details
                    this.router.navigate(['/folders', firstFolder.uuid]);
                    return [
                      FoldersActions.selectFolder({ folder: firstFolder }),
                      FoldersActions.loadFolderDetails({ uuid: firstFolder.uuid })
                    ];
                  } else {
                    // No folders left, navigate to base route
                    this.router.navigate(['/folders']);
                    return [FoldersActions.selectFolder({ folder: null })];
                  }
                })
              );
            }

            // If deleted folder was not active, do nothing
            return [];
          })
        )
      )
    )
  );


  constructor(
    private actions$: Actions,
    private foldersService: FoldersService,
    private folderItemsService: FolderItemsService,
    private toastService: ToastService,
    private store: Store,
    private router: Router,
    private solrService: SolrService,
    private translateService: TranslateService,
    private customSearchService: CustomSearchService,
    private queryParamsService: QueryParamsService,
    private userService: UserService,
    private folderSearchFiltersBuilder: FolderSearchFiltersBuilder,
    private folderSearchScope: FolderSearchScope
  ) {}

  /** Whether a pages request should run: only when a text term is active. */
  private shouldIncludePages(): boolean {
    return this.urlSearchQuery().trim().length > 0;
  }

  /**
   * The shared per-request context for the folder Solr requests (titles, facets,
   * pages), derived the same way SearchService.dispatchSearch derives it for the
   * main search: filters mapped to their search fields, per-facet operators,
   * year/date range clauses as the advanced query, and periodicalitem inclusion
   * when a date filter is active.
   */
  private folderRequestContext() {
    const filters = this.folderSearchFiltersBuilder.build();
    const fqFilters = [
      ...mapFacetsToSearchFields(filters.fqFilters ?? []),
      ...mapFacetsToSearchFields(filters.customFqClauses ?? []),
    ];
    const queryClauses = filters.queryClauses ?? [];
    return {
      fqFilters,
      facetOperators: mapOperatorsToSearchFields(this.queryParamsService.getOperators(this.urlParams())),
      advancedQuery: queryClauses.reduce<string | undefined>(
        (acc, clause) => appendToAdvancedQuery(acc, clause), undefined),
      includePeriodicalItem: queryClauses.length > 0,
      availabilityFilter: {
        isActive: this.customSearchService.isAvailabilityFilterActive(),
        licenses: this.customSearchService.getUserAvailableLicenses(),
        userLicenses: this.userService.licenses,
      },
    };
  }

  /** The facet field list for the folder search (standard + accessibility). */
  private folderFacetFields(): string[] {
    return [...facetKeys, facetKeysEnum.accessibility];
  }

  private storeSortBy(): SolrSortFields {
    let value = SolrSortFields.relevance;
    this.store.select(FoldersSelectors.selectSortParams).pipe(take(1)).subscribe(p => value = p.sortBy);
    return value;
  }

  private storeSortDirection(): SolrSortDirections {
    let value = SolrSortDirections.desc;
    this.store.select(FoldersSelectors.selectSortParams).pipe(take(1)).subscribe(p => value = p.sortDirection);
    return value;
  }

  private extractFolderUuidFromUrl(url: string): string | null {
    const matches = url.match(/\/folders\/([^\/\?]+)/);
    return matches ? matches[1] : null;
  }

  /**
   * Paginator window from the URL (?page/?pageSize), mirroring the main search.
   * `start` is the 0-based Solr offset of the combined titles+pages window.
   */
  private urlPaging(): { page: number; pageSize: number; start: number } {
    const queryParamMap = this.router.parseUrl(this.router.url).queryParamMap;
    const page = Math.max(1, Number(queryParamMap.get('page')) || 1);
    const pageSize = Number(queryParamMap.get('pageSize')) || 60;
    return { page, pageSize, start: (page - 1) * pageSize };
  }

  /** Free-text search term from the URL (?query=...), mirroring the main search. */
  private urlSearchQuery(): string {
    const query = this.router.parseUrl(this.router.url).queryParamMap.get('query');
    return query?.trim() ?? '';
  }

  /** Current URL query params as a plain record (single value or array per key). */
  private urlParams(): Record<string, string | string[]> {
    const urlTree = this.router.parseUrl(this.router.url);
    const params: Record<string, string | string[]> = {};
    urlTree.queryParamMap.keys.forEach(key => {
      const all = urlTree.queryParamMap.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    });
    return params;
  }

}
