import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of, combineLatest } from 'rxjs';
import { catchError, map, switchMap, tap, filter, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';
import { FoldersService, FolderSearchFilters } from '../services/folders.service';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { QueryParamsService } from '../../../core/services/QueryParamsManager';
import { buildYearRangeQuery, buildDateMinRangeQuery } from '../../../shared/utils/date-range-query';
import { FolderItemsService } from '../services/folder-items.service';
import { ToastService } from '../../../shared/services/toast.service';
import { TranslateService } from '@ngx-translate/core';
import { parseSearchDocument } from '../../models/search-document';
import { parseSoundTrack } from '../../models/sound-track.model';
import { DocumentTypeEnum } from '../../constants/document-type';
import { SolrService } from '../../../core/solr/solr.service';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
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
          map(folder => FoldersActions.createFolderSuccess({ folder })),
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
      switchMap(action =>
        this.foldersService.updateFolderItems(action.request).pipe(
          map(() => FoldersActions.updateFolderItemsSuccess({
            uuid: action.request.uuid,
            itemsCount: action.request.items.length,
            items: action.request.items
          })),
          catchError(error => of(FoldersActions.updateFolderItemsFailure({ error: error.message })))
        )
      )
    )
  );

  removeItemFromFolder$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.removeItemFromFolder),
      switchMap(action =>
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
          this.toastService.show(this.translateService.instant('folders.messages.created'));
        } else if (action.type === FoldersActions.updateFolderSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.updated'));
        } else if (action.type === FoldersActions.deleteFolderSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.deleted'));
        } else if (action.type === FoldersActions.updateFolderItemsSuccess.type) {
          this.toastService.show(this.translateService.instant('folders.messages.items-updated'));
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
              itemIds: folderDetails.items.flat().map(item => item.id)
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
        const filters = this.buildFolderSearchFilters();
        return this.foldersService.searchFolderItems(
          action.itemIds,
          undefined,
          undefined,
          undefined,
          filters
        ).pipe(
          map(response => this.parseFolderSearchResponse(response, filters)),
          catchError(error => of(FoldersActions.loadFolderSearchResultsFailure({ error: error.message })))
        );
      })
    )
  );

  searchFolders$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.searchFolders),
      switchMap(action =>
        // Get current folder details and search query from state
        this.store.select(FoldersSelectors.selectFolderDetails).pipe(
          take(1),
          filter(folderDetails => !!folderDetails),
          switchMap(folderDetails =>
            this.store.select(FoldersSelectors.selectSearchQuery).pipe(
              take(1),
              switchMap(currentSearchQuery => {
                const itemIds = folderDetails!.items.flat().map(item => item.id);
                // undefined → reuse stored query (facet change); '' clears it.
                const searchQuery = action.searchQuery ?? currentSearchQuery;

                const filters = this.buildFolderSearchFilters();
                return this.foldersService.searchFolderItems(
                  itemIds,
                  searchQuery,
                  action.sortBy,
                  action.sortDirection,
                  filters
                ).pipe(
                  map(response => this.parseFolderSearchResponse(response, filters)),
                  catchError(error => of(FoldersActions.loadFolderSearchResultsFailure({ error: error.message })))
                );
              })
            )
          )
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
    private userService: UserService
  ) {}

  private extractFolderUuidFromUrl(url: string): string | null {
    const matches = url.match(/\/folders\/([^\/\?]+)/);
    return matches ? matches[1] : null;
  }

  /**
   * Assembles all active filter dimensions for a folder search from the current
   * URL + CustomSearchService: standard facet fq, custom-defined facet clauses,
   * accessibility/availability licenses, and year/date range query clauses.
   */
  private buildFolderSearchFilters(): FolderSearchFilters {
    const params = this.urlParams();

    // Sync custom-search state (accessibility, where-to-search, ranges) from URL.
    this.customSearchService.initializeFromRoute();

    const queryClauses = [
      buildYearRangeQuery(params),
      buildDateMinRangeQuery(params)
    ].filter((c): c is string => !!c);

    const availabilityLicenses = this.customSearchService.isAvailabilityFilterActive()
      ? this.customSearchService.getUserAvailableLicenses()
      : [];

    return {
      fqFilters: this.queryParamsService.getFilters(params),
      customFqClauses: this.customSearchService.getSolrFqFilters(),
      availabilityLicenses,
      userLicenses: this.userService.licenses,
      queryClauses
    };
  }

  private parseFolderSearchResponse(response: any, filters: FolderSearchFilters) {
    const parsedResults = (response.response?.docs ?? []).map((doc: any) => {
      doc['highlighting'] = response.highlighting?.[doc.pid] || {};
      return this.parseDocument(doc);
    });

    const facetFields = response.facet_counts?.facet_fields ?? {};
    const totalCount = response.response?.numFound || 0;

    // Merge static custom-defined facets (accessibility, model, ranges) with the
    // Solr facet counts — same pipeline the search-results page uses.
    const facets = handleFacetsWithOperators(
      facetFields,
      facetFields,
      this.queryParamsService.getOperators(
        this.urlParams()
      ),
      {},
      this.userService.licenses,
      totalCount,
      [...(filters.fqFilters ?? []), ...(filters.customFqClauses ?? [])],
      response.facet_counts?.facet_queries,
      this.userService.isLoggedIn
    );

    return FoldersActions.loadFolderSearchResultsSuccess({
      results: parsedResults,
      totalCount,
      facets
    });
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

  private parseDocument(doc: any) {
    if (doc.model === DocumentTypeEnum.track) {
      const soundTrack = parseSoundTrack(doc);
      soundTrack.url = this.solrService.getAudioTrackMp3Url(soundTrack.pid);
      return soundTrack;
    }
    return parseSearchDocument(doc);
  }
}
