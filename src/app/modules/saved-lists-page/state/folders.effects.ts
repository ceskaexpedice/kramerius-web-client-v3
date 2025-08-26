import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, switchMap, tap, withLatestFrom, filter, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { Router, ActivatedRoute } from '@angular/router';
import { FoldersService } from '../services/folders.service';
import { ToastService } from '../../../shared/services/toast.service';
import { parseSearchDocument } from '../../models/search-document';
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

  showErrorToast$ = createEffect(() =>
    this.actions$.pipe(
      ofType(
        FoldersActions.loadFoldersFailure,
        FoldersActions.createFolderFailure,
        FoldersActions.updateFolderFailure,
        FoldersActions.deleteFolderFailure,
        FoldersActions.updateFolderItemsFailure,
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
              return parseSearchDocument(doc);
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

  // Wait for folders to be loaded and then handle initial folder loading
  handleFoldersLoaded$ = createEffect(() =>
    this.actions$.pipe(
      ofType(FoldersActions.loadFoldersSuccess),
      withLatestFrom(
        this.store.select(FoldersSelectors.selectSelectedFolder),
        this.store.select(FoldersSelectors.selectFolderDetails)
      ),
      switchMap(([action, selectedFolder, folderDetails]) => {
        // Only auto-load if:
        // 1. No folder is currently selected AND
        // 2. No folder details are loaded AND
        // 3. We're on the folders page AND
        // 4. We have folders available
        if (!selectedFolder && !folderDetails && this.isOnFoldersPage() && action.folders.length > 0) {
          return [FoldersActions.loadFirstFolderOnInit()];
        }
        return [];
      })
    )
  );

  constructor(
    private actions$: Actions,
    private foldersService: FoldersService,
    private toastService: ToastService,
    private store: Store,
    private router: Router
  ) {}

  private extractFolderUuidFromUrl(url: string): string | null {
    const matches = url.match(/\/folders\/([^\/\?]+)/);
    return matches ? matches[1] : null;
  }

  private isOnFoldersPage(): boolean {
    return this.router.url.includes('/folders') || this.router.url.includes('/saved-lists');
  }
}
