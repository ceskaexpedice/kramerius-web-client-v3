import {Component, signal, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {ActivatedRoute} from '@angular/router';
import {AppResultsViewType} from '../settings/settings.model';
import * as FoldersActions from './state/folders.actions';
import {selectActiveFolderItems, selectAllFolders, selectFolderDetails, selectFolderSearchResults, selectFolderDetailsLoading, selectSortParams, selectUserOwnedFolders} from './state';
import {first} from 'rxjs';
import {SolrSortFields, SolrSortDirections} from '../../core/solr/solr-helpers';
import {ViewMode} from '../periodical/models/view-mode.enum';

@Component({
  selector: 'app-saved-lists-page',
  standalone: false,
  templateUrl: './saved-lists-page.component.html',
  styleUrl: './saved-lists-page.component.scss'
})
export class SavedListsPageComponent implements OnInit {

  activeFolderItems = this.store.select(selectFolderSearchResults);
  activeFolder = this.store.select(selectFolderDetails);
  folders = this.store.select(selectAllFolders);
  sortParams = this.store.select(selectSortParams);
  userOwnedFolders = this.store.select(selectUserOwnedFolders);

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-element-3' },
    { value: AppResultsViewType.list, icon: 'icon-row-vertical' }
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);
  isEditingTitle = signal<boolean>(false);
  editedTitle = signal<string>('');

  constructor(private store: Store, private route: ActivatedRoute) {
  }

  ngOnInit() {
    // Check if we're on the base route without UUID
    const uuid = this.route.snapshot.paramMap.get('uuid');

    if (!uuid) {
      // Always dispatch loadFirstFolderOnInit - the effect will handle waiting for folders
      this.store.dispatch(FoldersActions.loadFirstFolderOnInit());
    } else {
      // Check if folder details are already loading or loaded
      this.store.select(selectFolderDetailsLoading).pipe(first()).subscribe(isLoading => {
        this.store.select(selectFolderDetails).pipe(first()).subscribe(folderDetails => {
          const isAlreadyLoadingThisFolder = isLoading;
          const isAlreadyLoadedThisFolder = folderDetails?.uuid === uuid;

          if (!isAlreadyLoadingThisFolder && !isAlreadyLoadedThisFolder) {
            // Load specific folder based on UUID only if not already loading/loaded
            this.store.dispatch(FoldersActions.loadFolderDetails({ uuid }));
          } else {
          }
        });
      });
    }
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.store.dispatch(FoldersActions.setSortParams({
      sortBy: event.value,
      sortDirection: event.direction
    }));
    this.store.dispatch(FoldersActions.searchFolders({
      searchQuery: '', // Empty string will cause effect to use current searchQuery from state
      sortBy: event.value,
      sortDirection: event.direction
    }));
  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    // update the URL with the new view type
    const url = new URL(window.location.href);
    url.searchParams.set('viewType', view);
    window.history.replaceState({}, '', url.toString());
  }

  startEditingTitle(currentTitle: string) {
    this.editedTitle.set(currentTitle);
    this.isEditingTitle.set(true);
  }

  cancelEditingTitle() {
    this.isEditingTitle.set(false);
    this.editedTitle.set('');
  }

  submitTitleEdit(folderUuid: string) {
    const newTitle = this.editedTitle().trim();
    if (newTitle && newTitle !== '') {
      this.store.dispatch(FoldersActions.updateFolder({
        uuid: folderUuid,
        folder: { name: newTitle }
      }));
      this.isEditingTitle.set(false);
    }
  }

  isCurrentUserOwner(folder: any): boolean {
    if (!folder) return false;

    // Check if the folder exists in the user's owned folders list
    let isOwner = false;
    this.userOwnedFolders.pipe(first()).subscribe(ownedFolders => {
      isOwner = ownedFolders.some(ownedFolder => ownedFolder.uuid === folder.uuid);
    });

    return isOwner;
  }

  onShareFolder() {
    this.activeFolder.pipe(first()).subscribe(folder => {
      if (folder) {
        // TODO: Implement share functionality - copy folder link to clipboard
        const url = `${window.location.origin}/folders/${folder.uuid}`;
        navigator.clipboard.writeText(url).then(() => {
          console.log('Folder link copied to clipboard');
          // TODO: Show toast notification
        });
      }
    });
  }

  onDeleteFolder() {
    this.activeFolder.pipe(first()).subscribe(folder => {
      if (folder && this.isCurrentUserOwner(folder)) {
        // TODO: Show confirmation dialog before deleting
        if (confirm(`Are you sure you want to delete the folder "${folder.name}"?`)) {
          this.store.dispatch(FoldersActions.deleteFolder({ uuid: folder.uuid }));
        }
      }
    });
  }

  onDownloadFolder() {
    this.activeFolder.pipe(first()).subscribe(folder => {
      if (folder) {
        // TODO: Implement folder export/download functionality
        console.log('Download folder:', folder.name);
        // This could export folder contents as CSV, JSON, etc.
      }
    });
  }

  protected readonly ViewOptions = AppResultsViewType;
  protected readonly ViewMode = ViewMode;
}
