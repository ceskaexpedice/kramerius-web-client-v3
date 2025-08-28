import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap, filter, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';
import { FoldersService } from '../services/folders.service';
import { ToastService } from '../../../shared/services/toast.service';
import { parseSearchDocument } from '../../models/search-document';
import { parseSoundTrack } from '../../models/sound-track.model';
import { DocumentTypeEnum } from '../../constants/document-type';
import { SolrService } from '../../../core/solr/solr.service';
import * as FoldersActions from './folders.actions';
import * as FoldersSelectors from './folders.selectors';
import * as AuthActions from '../../../core/auth/store/auth.actions';

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
            itemsCount: action.request.items.length
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
            itemsCount: action.request.items.length
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
        FoldersActions.updateFolderItemsSuccess
      ),
      tap(action => {
        if (action.type === FoldersActions.createFolderSuccess.type) {
          this.toastService.show('List created successfully');
        } else if (action.type === FoldersActions.updateFolderSuccess.type) {
          this.toastService.show('List updated successfully');
        } else if (action.type === FoldersActions.deleteFolderSuccess.type) {
          this.toastService.show('List deleted successfully');
        } else if (action.type === FoldersActions.updateFolderItemsSuccess.type) {
          this.toastService.show('List items updated successfully');
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
      switchMap(action =>
        this.foldersService.searchFolderItems(action.itemIds).pipe(
          map(response => {
            const parsedResults = (response.response?.docs ?? []).map((doc: any) => {
              doc['highlighting'] = response.highlighting?.[doc.pid] || {};
              return this.parseDocument(doc);
            });
            return FoldersActions.loadFolderSearchResultsSuccess({
              results: parsedResults,
              totalCount: response.response?.numFound || 0
            });
          }),
          catchError(error => of(FoldersActions.loadFolderSearchResultsFailure({ error: error.message })))
        )
      )
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
                const searchQuery = action.searchQuery || currentSearchQuery;
                
                return this.foldersService.searchFolderItems(
                  itemIds, 
                  searchQuery,
                  action.sortBy,
                  action.sortDirection
                ).pipe(
                  map(response => {
                    const parsedResults = (response.response?.docs ?? []).map((doc: any) => {
                      doc['highlighting'] = response.highlighting?.[doc.pid] || {};
                      return this.parseDocument(doc);
                    });
                    return FoldersActions.loadFolderSearchResultsSuccess({
                      results: parsedResults,
                      totalCount: response.response?.numFound || 0
                    });
                  }),
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
            this.router.navigate(['/folders', firstFolder.uuid]);
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
      switchMap(() => [FoldersActions.loadFolders()])
    )
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
    private toastService: ToastService,
    private store: Store,
    private router: Router,
    private solrService: SolrService
  ) {}

  private extractFolderUuidFromUrl(url: string): string | null {
    const matches = url.match(/\/folders\/([^\/\?]+)/);
    return matches ? matches[1] : null;
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
