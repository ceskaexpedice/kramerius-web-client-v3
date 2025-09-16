import {Component, EventEmitter, inject, Input, OnInit, Output, signal, OnDestroy} from '@angular/core';
import {Store} from '@ngrx/store';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {InputComponent} from '../input/input.component';
import {Folder, selectUserOwnedFolders, selectUserFollowedFolders} from '../../../modules/saved-lists-page/state';
import * as FoldersActions from '../../../modules/saved-lists-page/state/folders.actions';
import {combineLatest, map, startWith, takeUntil, Subject} from 'rxjs';
import {toObservable} from '@angular/core/rxjs-interop';
import {MatCheckbox, MatCheckboxChange} from '@angular/material/checkbox';
import {Actions, ofType} from '@ngrx/effects';
import {SavedListsService} from '../../../modules/saved-lists-page/services/saved-lists.service';
import {FormsModule} from '@angular/forms';
import {DontShowAgainService} from '../../services';
import {DontShowDialogs} from '../../services/dont-show-again.service';
import {FolderItemsService} from '../../../modules/saved-lists-page/services/folder-items.service';
import {LocalStorageService} from '../../services/local-storage.service';


@Component({
  selector: 'app-favorites-popup',
  standalone: true,
  imports: [
    AsyncPipe,
    NgForOf,
    NgIf,
    TranslatePipe,
    InputComponent,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './favorites-popup.component.html',
  styleUrl: './favorites-popup.component.scss'
})
export class FavoritesPopupComponent implements OnInit, OnDestroy {
  dontShowSuccessAgain = false;

  @Input() itemId!: string;
  @Input() itemName?: string;
  @Input() currentFolderId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private store = inject(Store);
  private actions$ = inject(Actions);
  private translateService = inject(TranslateService);
  private savedListsService = inject(SavedListsService);
  private dontShowAgainService = inject(DontShowAgainService);
  private folderItemsService = inject(FolderItemsService);
  private localStorage = inject(LocalStorageService);
  private destroy$ = new Subject<void>();

  private readonly LAST_USED_FOLDER_KEY = 'last_used_folder';

  private _shouldAddItemToNewFolder = false;
  private _shouldCreateRealFavoritesFolder = false;
  private _hasFavoritesFolder = false;
  private readonly FAKE_FAVORITES_UUID = 'fake-favorites-folder-uuid';

  private shouldAddItemToNewFolder() {
    return this._shouldAddItemToNewFolder;
  }

  private setShouldAddItemToNewFolder(value: boolean) {
    this._shouldAddItemToNewFolder = value;
  }

  private shouldCreateRealFavoritesFolder() {
    return this._shouldCreateRealFavoritesFolder;
  }

  private setShouldCreateRealFavoritesFolder(value: boolean) {
    this._shouldCreateRealFavoritesFolder = value;
  }

  private setLastUsedFolder(folderId: string): void {
    this.localStorage.set(this.LAST_USED_FOLDER_KEY, folderId);
  }

  private getLastUsedFolder(): string | null {
    return this.localStorage.get(this.LAST_USED_FOLDER_KEY);
  }

  private validateAndGetLastUsedFolder(validFolderIds: string[]): string | null {
    const lastUsedId = this.getLastUsedFolder();
    
    if (lastUsedId && validFolderIds.includes(lastUsedId)) {
      return lastUsedId;
    } else if (lastUsedId) {
      // Clean up invalid last used folder
      this.localStorage.remove(this.LAST_USED_FOLDER_KEY);
    }
    
    return null;
  }

  searchTerm = signal('');
  newListName = signal('');
  selectedFolderIds = signal<Set<string>>(new Set());
  showSuccess = signal(false);

  ownedFolders$ = this.store.select(selectUserOwnedFolders);
  followedFolders$ = this.store.select(selectUserFollowedFolders);

  // Combine owned and followed folders, add fake favorites unless real one exists
  allFolders$ = combineLatest([
    this.ownedFolders$,
    this.followedFolders$
  ]).pipe(
    map(([owned, followed]) => {
      const allFolders = [...owned, ...followed];
      const favoritesTitle = this.translateService.instant('my-favorites-list--title');

      // Check if user already has a folder with the favorites name
      this._hasFavoritesFolder = allFolders.some(folder =>
        folder.name.toLowerCase() === favoritesTitle.toLowerCase()
      );

      // Always add fake favorites folder unless user already has one with same name
      if (!this._hasFavoritesFolder) {
        const fakeFavoritesFolder: Folder = {
          name: favoritesTitle,
          uuid: this.FAKE_FAVORITES_UUID,
          itemsCount: 0,
          users: [],
          updatedAt: new Date().toISOString()
        };

        // Add fake folder at the beginning
        allFolders.unshift(fakeFavoritesFolder);
      }

      return allFolders;
    })
  );

  // Observable to determine if search should be shown
  shouldShowSearch$ = this.allFolders$.pipe(
    map(folders => folders.length > 10)
  );


  private initialSortApplied = signal(false);

  // For template usage with search filtering
  filteredLists$ = combineLatest([
    this.allFolders$,
    toObservable(this.searchTerm).pipe(startWith('')),
    toObservable(this.selectedFolderIds).pipe(startWith(new Set<string>())),
    this.folderItemsService.getFolderIdsContainingItem(this.itemId).pipe(startWith([] as string[]))
  ]).pipe(
    map(([folders, searchTerm, selectedFolderIds, foldersContainingItem]) => {
      let filteredFolders = folders;

      // Apply search filter if search term exists
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        filteredFolders = folders.filter(folder =>
          folder.name.toLowerCase().includes(searchLower)
        );
      }

      // Map to list format with selection state
      const mappedFolders = filteredFolders.map(folder => ({
        folder,
        isSelected: selectedFolderIds.has(folder.uuid) || foldersContainingItem.includes(folder.uuid)
      }));

      // Only sort on initial load, not on every check/uncheck
      if (!this.initialSortApplied()) {
        this.initialSortApplied.set(true);
        return mappedFolders.sort((a, b) => {
          // If both have same selection state, maintain original order
          if (a.isSelected === b.isSelected) {
            return 0;
          }
          // Selected items first
          return a.isSelected ? -1 : 1;
        });
      }

      // After initial sort, maintain the order and just update selection state
      return mappedFolders;
    })
  );

  ngOnInit() {
    // Pre-check the current folder if provided
    if (this.currentFolderId) {
      const selected = new Set(this.selectedFolderIds());
      selected.add(this.currentFolderId);
      this.selectedFolderIds.set(selected);
    }

    // Determine which folder to pre-check based on priority:
    // 1. Current folder (if specified)
    // 2. Folders that already contain this item
    // 3. Last used folder (if valid)
    // 4. Fake favorites folder (fallback)
    
    this.folderItemsService.getFolderIdsContainingItem(this.itemId).pipe(
      takeUntil(this.destroy$)
    ).subscribe(folderIds => {
      const selected = new Set(this.selectedFolderIds());

      if (folderIds.length > 0) {
        // Item is already in some folders - check those folders
        folderIds.forEach(folderId => selected.add(folderId));
        this.selectedFolderIds.set(selected);
      } else if (!this.currentFolderId) {
        // Item is not in any folder and no current folder specified
        // Check for last used folder or fallback to fake favorites
        this.allFolders$.pipe(
          takeUntil(this.destroy$)
        ).subscribe(folders => {
          const allFolderIds = folders.map(f => f.uuid);
          const lastUsedFolderId = this.validateAndGetLastUsedFolder(allFolderIds);
          
          const newSelected = new Set(this.selectedFolderIds());
          
          if (lastUsedFolderId) {
            // Pre-check last used folder
            newSelected.add(lastUsedFolderId);
          } else if (this._hasFavoritesFolder) {
            // Fallback: pre-check real favorites folder
            const favoriteFolder = folders.find(f => f.name === this.translateService.instant('my-favorites-list--title'));
            if (favoriteFolder) {
              newSelected.add(favoriteFolder.uuid);
            }
          } else {
            // Fallback: pre-check fake favorites folder
            const fakeFavoriteFolder = folders.find(f => f.uuid === this.FAKE_FAVORITES_UUID);
            if (fakeFavoriteFolder) {
              newSelected.add(this.FAKE_FAVORITES_UUID);
            }
          }
          
          this.selectedFolderIds.set(newSelected);
        });
      }
    });

    this.actions$.pipe(
      ofType(FoldersActions.createFolderSuccess),
      takeUntil(this.destroy$)
    ).subscribe(({ folder }) => {

      if (this.shouldAddItemToNewFolder() || this.shouldCreateRealFavoritesFolder()) {

        // Store newly created folder as last used
        this.setLastUsedFolder(folder.uuid);

        // Add the item to the newly created folder
        this.store.dispatch(FoldersActions.updateFolderItems({
          request: {
            uuid: folder.uuid,
            items: [this.itemId]
          }
        }));

        // Reset the flags
        this.setShouldAddItemToNewFolder(false);
        this.setShouldCreateRealFavoritesFolder(false);

        const showSuccessPopup = this.dontShowAgainService.shouldShowDialog(DontShowDialogs.FavoritesPopup);

        if (showSuccessPopup) {
          this.showSuccess.set(true);
        } else {
          this.onCloseSuccess();
        }
      }
    });

    // Listen for successful item updates to reload folders
    this.actions$.pipe(
      ofType(FoldersActions.updateFolderItemsSuccess),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // Reload folders to get updated item counts
      this.store.dispatch(FoldersActions.loadFolders());
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }


  onListToggle(folder: Folder, change: MatCheckboxChange) {
    const selected = new Set(this.selectedFolderIds());
    if (change.checked) {
      selected.add(folder.uuid);
    } else {
      selected.delete(folder.uuid);
    }
    this.selectedFolderIds.set(selected);
  }

  onCreateNewList() {
    const listName = this.newListName().trim();
    if (!listName) {
      console.log('No list name, returning early');
      return;
    }

    // Set flag to indicate we want to add item to the newly created folder
    this.setShouldAddItemToNewFolder(true);

    // Create the folder
    this.store.dispatch(FoldersActions.createFolder({
      folder: { name: listName }
    }));

    // Clear the input after creating
    this.newListName.set('');
  }

  hasSelectedLists(): boolean {
    return this.selectedFolderIds().size > 0;
  }

  onCancel() {
    this.close.emit();
  }

  onRemoveFromCurrentFolder() {
    if (!this.currentFolderId) return;

    this.savedListsService.removeItemFromFolder(
      this.currentFolderId,
      this.itemId,
      this.itemName,
      () => this.close.emit()
    );
  }

  onDone() {
    const newListName = this.newListName().trim();
    const selectedIds = Array.from(this.selectedFolderIds());

    // Store the first selected folder as last used (excluding fake favorites)
    const realSelectedIds = selectedIds.filter(id => id !== this.FAKE_FAVORITES_UUID);
    if (realSelectedIds.length > 0) {
      this.setLastUsedFolder(realSelectedIds[0]);
    }

    if (newListName) {
      // Create new list and set flag to add item to it
      this.setShouldAddItemToNewFolder(true);
      this.store.dispatch(FoldersActions.createFolder({
        folder: { name: newListName }
      }));
    }

    // Handle fake favorites folder selection
    const isFakeFavoritesSelected = selectedIds.includes(this.FAKE_FAVORITES_UUID);

    if (isFakeFavoritesSelected) {
      // Set flag to create real favorites folder and add item to it
      this.setShouldCreateRealFavoritesFolder(true);
      this.store.dispatch(FoldersActions.createFolder({
        folder: { name: this.translateService.instant('my-favorites-list--title') }
      }));
    }

    // Add item to selected existing lists (excluding fake folder)
    realSelectedIds.forEach(folderId => {
      this.store.dispatch(FoldersActions.updateFolderItems({
        request: {
          uuid: folderId,
          items: [this.itemId]
        }
      }));
    });

    // Show success state only if no new folder is being created (otherwise the subscription will handle it)
    if (!newListName && !isFakeFavoritesSelected) {
      const showSuccessPopup = this.dontShowAgainService.shouldShowDialog(DontShowDialogs.FavoritesPopup);

      if (showSuccessPopup) {
        this.showSuccess.set(true);
      } else {
        this.onCloseSuccess();
      }
    }
  }

  onCloseSuccess() {
    if (this.dontShowSuccessAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.FavoritesPopup);
    }
    this.success.emit();
    this.close.emit();
  }
}
