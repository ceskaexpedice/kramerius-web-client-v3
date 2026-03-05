import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { Store } from '@ngrx/store';
import { ActivatedRoute } from '@angular/router';
import { AppResultsViewType } from '../settings/settings.model';
import * as FoldersActions from './state/folders.actions';
import { selectActiveFolderItems, selectAllFolders, selectFolderDetails, selectFolderSearchResults, selectFolderDetailsLoading, selectSortParams, selectUserOwnedFolders } from './state';
import { first, map } from 'rxjs';
import { SolrSortFields, SolrSortDirections } from '../../core/solr/solr-helpers';
import { ViewMode } from '../periodical/models/view-mode.enum';
import { ToolbarAction, ToolbarActionEvent } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { DocumentTypeEnum } from '../constants/document-type';
import { MusicService } from '../music/services/music.service';
import { SoundService } from '../../shared/services/sound.service';
import { SoundTrackModel, TrackViewType } from '../models/sound-track.model';
import { PopupPositioningService, PopupState } from '../../shared/services/popup-positioning.service';
import { SavedListsService } from './services/saved-lists.service';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { SearchDocument } from '../models/search-document';

@Component({
  selector: 'app-saved-lists-page',
  standalone: false,
  templateUrl: './saved-lists-page.component.html',
  styleUrl: './saved-lists-page.component.scss'
})
export class SavedListsPageComponent implements OnInit, OnDestroy {

  activeFolderItems = this.store.select(selectFolderSearchResults);
  activeFolder = this.store.select(selectFolderDetails);
  folders = this.store.select(selectAllFolders);
  sortParams = this.store.select(selectSortParams);
  userOwnedFolders = this.store.select(selectUserOwnedFolders);
  loading$ = this.store.select(selectFolderDetailsLoading);

  // Separate sound recordings from other items
  soundRecordingItems = this.activeFolderItems.pipe(
    map(items => items.filter(item => item.model === DocumentTypeEnum.track))
  );

  nonSoundRecordingItems = this.activeFolderItems.pipe(
    map(items => items.filter(item => item.model !== DocumentTypeEnum.track))
  );

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-row-vertical', ariaLabel: 'view-grid--arialabel' },
    { value: AppResultsViewType.list, icon: 'icon-grid-8', ariaLabel: 'view-list--arialabel' },
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);
  currentEditingFolder = signal<{ uuid: string, name: string } | null>(null);
  exportRecord = signal<SearchDocument | null>(null);
  titleEditPopupState: PopupState;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    public musicService: MusicService,
    public soundService: SoundService,
    private popupPositioningService: PopupPositioningService,
    private savedListsService: SavedListsService
  ) {
    this.titleEditPopupState = this.popupPositioningService.createPopupState();
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
      searchQuery: '',
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

  openExportPanel(record: SearchDocument): void {
    this.exportRecord.set(record);
  }

  closeExportPanel(): void {
    this.exportRecord.set(null);
  }

  startEditingTitle(folderUuid: string, currentTitle: string, event: Event) {
    this.currentEditingFolder.set({ uuid: folderUuid, name: currentTitle });

    this.popupPositioningService.showPopup(
      this.titleEditPopupState,
      {
        triggerEvent: event,
        popupWidth: 300,
        popupHeight: 200,
        preferredSide: 'center',
        offsetY: 10
      },
      '.title-edit-popup-wrapper'
    );
  }

  onTitleEditClose() {
    this.titleEditPopupState.closePopup();
    this.currentEditingFolder.set(null);
  }

  onTitleEditSave(newTitle: string) {
    const folder = this.currentEditingFolder();
    if (folder && newTitle.trim()) {
      this.store.dispatch(FoldersActions.updateFolder({
        uuid: folder.uuid,
        folder: { name: newTitle.trim() }
      }));
      this.onTitleEditClose();
    }
  }

  ngOnDestroy() {
    this.popupPositioningService.cleanup();
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

  getToolbarActions(folder: any): ToolbarAction[] {
    const actions: ToolbarAction[] = [];

    // Delete action - only for folder owners
    if (folder && this.isCurrentUserOwner(folder)) {
      actions.push({
        id: 'delete',
        icon: 'icon-trash',
        tooltip: 'Delete folder',
        label: 'Delete'
      });
    }

    // Share action - always visible
    actions.push({
      id: 'share',
      icon: 'icon-send-2',
      tooltip: 'Share folder link',
      label: 'Share',
    });

    // Download/Export action - always visible
    actions.push({
      id: 'download',
      icon: 'icon-download',
      tooltip: 'Export folder contents',
      label: 'Download'
    });

    return actions;
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
        this.savedListsService.deleteFolder(folder.uuid, folder.name);
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

  // New unified action handler
  onToolbarAction(event: ToolbarActionEvent) {
    switch (event.id) {
      case 'share':
        this.onShareFolder();
        break;
      case 'delete':
        this.onDeleteFolder();
        break;
      case 'download':
        this.onDownloadFolder();
        break;
      default:
        console.warn('Unknown toolbar action:', event.id);
    }
  }

  // Methods for handling track playback with tracks array
  onTrackSelect(track: SoundTrackModel) {
    this.soundRecordingItems.pipe(first()).subscribe(tracks => {
      this.musicService.addTracksFromListToQueueAndPlayFirst(track, tracks as SoundTrackModel[]);
    });
  }

  onTrackAddToQueue(track: SoundTrackModel) {
    this.musicService.addTrackToQueue(track);
  }

  onTrackDownload(track: SoundTrackModel) {
    this.musicService.downloadTrack(track);
  }

  onTrackRemove(track: SoundTrackModel) {
    this.activeFolder.pipe(first()).subscribe(folder => {
      if (folder && folder.uuid) {
        this.savedListsService.removeTrackFromFolder(folder.uuid, track);
      }
    });
  }

  playAllTracks() {
    this.soundRecordingItems.pipe(first()).subscribe(tracks => {
      if (tracks && tracks.length > 0) {
        this.soundService.clearQueue();
        this.soundService.addTracksToQueue(tracks as SoundTrackModel[]);
        this.soundService.play(tracks[0] as SoundTrackModel);
      }
    });
  }

  protected readonly ViewOptions = AppResultsViewType;
  protected readonly ViewMode = ViewMode;
  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  // Convert SearchDocument to RecordItem
  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }
  protected readonly TrackViewType = TrackViewType;
}
