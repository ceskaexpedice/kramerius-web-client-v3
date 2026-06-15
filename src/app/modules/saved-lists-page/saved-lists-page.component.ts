import { Component, signal, OnInit, OnDestroy } from '@angular/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AppResultsViewType } from '../settings/settings.model';
import * as FoldersActions from './state/folders.actions';
import { selectActiveFolderItems, selectAllFolders, selectFolderDetails, selectFolderSearchResults, selectFolderDetailsLoading, selectFolderSearchResultsLoading, selectSortParams, selectUserOwnedFolders, selectFolderBannerState, FolderBannerState } from './state';
import { DontShowAgainService, DontShowDialogs } from '../../shared/services/dont-show-again.service';
import { InfoBannerAction } from '../../shared/components/info-banner/info-banner.component';
import { combineLatest, first, map, Observable, Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SolrSortFields, SolrSortDirections } from '../../core/solr/solr-helpers';
import { ViewMode } from '../periodical/models/view-mode.enum';
import { ToolbarAction, ToolbarActionEvent } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { DocumentTypeEnum } from '../constants/document-type';
import { MusicService } from '../music/services/music.service';
import { SoundService } from '../../shared/services/sound.service';
import { SoundTrackModel, TrackViewType } from '../models/sound-track.model';
import { PopupPositioningService, PopupState } from '../../shared/services/popup-positioning.service';
import { SavedListsService } from './services/saved-lists.service';
import { FoldersService } from './services/folders.service';
import { SavedListsFilterService } from './services/saved-lists-filter.service';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { SearchDocument } from '../models/search-document';
import { ExportService } from '../../shared/services/export.service';
import { MatDialog } from '@angular/material/dialog';
import { FolderShareDialogComponent } from '../../shared/dialogs/folder-share-dialog/folder-share-dialog.component';
import { selectIsAuthenticated } from '../../core/auth/store';

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
  // Drive the loading skeleton off both the initial folder-details load and the
  // item search-results load. The grid items come from selectFolderSearchResults,
  // whose fetch toggles selectFolderSearchResultsLoading — that flag (not just the
  // details one) is what must gate the skeleton so it also shows on filter/sort/search.
  loading$ = combineLatest([
    this.store.select(selectFolderDetailsLoading),
    this.store.select(selectFolderSearchResultsLoading),
  ]).pipe(map(([detailsLoading, resultsLoading]) => detailsLoading || resultsLoading));
  isLoggedIn$ = this.store.select(selectIsAuthenticated);
  bannerState$ = this.store.select(selectFolderBannerState);

  // Active facet/range filters rendered as removable tags above the results,
  // mirroring the search-results page. Assigned in the constructor so the
  // filter service is available.
  selectedTags$!: Observable<string[]>;

  // Free-text query (q) used to filter items within the active folder. Seeded
  // from stored state so it survives reopening the panel.
  searchInput = signal<string | number>('');

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
  showFacetFilters = signal<boolean>(false);
  facetFiltersContentVisible = signal(false);
  // Pending "don't show again" choice — persisted only when an action (Save/Remove)
  // is taken, not when the checkbox is toggled.
  pendingDontShow = signal(false);
  // Transient success banner shown for 5s after saving the folder to the library.
  savedBannerVisible = signal(false);
  private savedBannerTimer?: ReturnType<typeof setTimeout>;
  titleEditPopupState: PopupState;

  private fqParamsSubscription?: Subscription;
  private searchInputSubscription?: Subscription;
  private searchQueryInput$ = new Subject<string>();
  private searchQuerySubscription?: Subscription;
  private facetFiltersContentTimer?: ReturnType<typeof setTimeout>;

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    public musicService: MusicService,
    public soundService: SoundService,
    private popupPositioningService: PopupPositioningService,
    private savedListsService: SavedListsService,
    private exportService: ExportService,
    private dialog: MatDialog,
    private foldersService: FoldersService,
    public savedListsFilterService: SavedListsFilterService,
    private router: Router,
    private translate: TranslateService,
    private dontShowAgain: DontShowAgainService
  ) {
    this.titleEditPopupState = this.popupPositioningService.createPopupState();
    this.selectedTags$ = this.savedListsFilterService.selectedTags;
    // The search box is seeded from the URL (?query=...) in ngOnInit so it survives
    // reloads and stays in sync with the selected-tag.
  }

  ngOnInit() {
    // Check if we're on the base route without UUID
    const uuid = this.route.snapshot.paramMap.get('uuid');

    if (!uuid) {
      // Always dispatch loadFirstFolderOnInit - the effect will handle waiting for folders
      this.store.dispatch(FoldersActions.loadFirstFolderOnInit());
    } else {
      // Check if folder details are already loading or loaded
      combineLatest([
        this.store.select(selectFolderDetailsLoading),
        this.store.select(selectFolderDetails)
      ]).pipe(first()).subscribe(([isLoading, folderDetails]) => {
        const isAlreadyLoadingThisFolder = isLoading;
        const isAlreadyLoadedThisFolder = folderDetails?.uuid === uuid;

        if (!isAlreadyLoadingThisFolder && !isAlreadyLoadedThisFolder) {
          // Load specific folder based on UUID only if not already loading/loaded
          this.store.dispatch(FoldersActions.loadFolderDetails({ uuid }));
        }
      });
    }

    this.exportService.rehydrateExportPanel(
      this.route,
      this.activeFolderItems,
      doc => this.exportRecord.set(doc)
    );

    // Keep the search box in sync with the URL (?query=...) — covers back/forward
    // navigation and the tag's remove/clear-all, both of which clear the param.
    this.searchInputSubscription = this.route.queryParams.subscribe(params => {
      this.searchInput.set(params['query'] ?? '');
    });

    // Debounce keystrokes before writing the term to the URL, and replace history
    // (rather than push) so typing doesn't stack back-button entries.
    this.searchQuerySubscription = this.searchQueryInput$.pipe(
      debounceTime(300),
      map(q => q.trim()),
      distinctUntilChanged()
    ).subscribe(term => {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { query: term || null, page: 1 },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    });

    // Re-run the folder search whenever the selected filters change. Facet toggles,
    // range/accessibility selections, and the free-text query (?query=...) update
    // the URL; this picks up the change once navigation has committed, so the effect
    // reads the current params.
    const FILTER_PARAM_KEYS = ['fq', 'customSearch', 'yearFrom', 'yearTo', 'dateFrom', 'dateTo', 'dateOffset', 'query'];
    let firstFilterEmission = true;
    this.fqParamsSubscription = this.route.queryParams.pipe(
      map(params => JSON.stringify(FILTER_PARAM_KEYS.map(key => params[key] ?? null))),
      distinctUntilChanged()
    ).subscribe(() => {
      // Skip the initial emission — the folder is loaded via loadFolderDetails →
      // loadFolderSearchResults, which already honors the URL filters.
      if (firstFilterEmission) {
        firstFilterEmission = false;
        return;
      }
      // The effect reads the free-text query straight from the URL.
      this.store.dispatch(FoldersActions.searchFolders({}));
    });
  }

  toggleFacetFilters() {
    const willOpen = !this.showFacetFilters();
    this.showFacetFilters.set(willOpen);
    clearTimeout(this.facetFiltersContentTimer);

    if (willOpen) {
      this.facetFiltersContentTimer = setTimeout(() => this.facetFiltersContentVisible.set(true), 300);
      return;
    }

    this.facetFiltersContentVisible.set(false);
  }

  /**
   * Filter items in the active folder by a free-text query (q). Writes the term to
   * the URL (?query=...) so it shows up as a selected tag, persists in the URL, and
   * hits the same Solr attributes as the main search — the queryParams subscription
   * picks up the change and re-runs the folder search.
   */
  onSearchQuery(query: string | number): void {
    this.searchQueryInput$.next(String(query ?? ''));
  }

  /** Clear the free-text query (removes ?query= from the URL) and reload the folder. */
  onClearSearchQuery(): void {
    this.searchQueryInput$.next('');
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.store.dispatch(FoldersActions.setSortParams({
      sortBy: event.value,
      sortDirection: event.direction
    }));
    this.store.dispatch(FoldersActions.searchFolders({
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
    this.exportService.writeExportPidToUrl(this.route, record.pid);
  }

  closeExportPanel(): void {
    this.exportRecord.set(null);
    this.exportService.writeExportPidToUrl(this.route, null);
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
    this.fqParamsSubscription?.unsubscribe();
    this.searchInputSubscription?.unsubscribe();
    this.searchQuerySubscription?.unsubscribe();
    clearTimeout(this.facetFiltersContentTimer);
    clearTimeout(this.savedBannerTimer);
  }

  shouldShowSharedBanner(): boolean {
    return this.dontShowAgain.shouldShowDialog(DontShowDialogs.SharedFolderBanner);
  }

  bannerActions(state: FolderBannerState): InfoBannerAction[] {
    if (!state) return [];
    if (state.kind === 'login') {
      return [{
        id: 'login',
        label: this.translate.instant('shared-folder-banner--login-action'),
        icon: 'icon-login',
        style: 'login secondary',
      }];
    }
    if (state.kind === 'invite') {
      return [{
        id: 'follow',
        label: this.translate.instant('shared-folder-banner--add-action'),
        icon: 'icon-add',
        style: 'login secondary',
      }];
    }
    return [
      {
        id: 'copy',
        label: this.translate.instant('shared-folder-banner--save-action'),
        icon: 'icon-heart',
        style: 'outlined light',
      },
      {
        id: 'remove',
        label: this.translate.instant('shared-folder-banner--remove-action'),
        icon: 'icon-trash',
        style: 'outlined light',
      },
    ];
  }

  onBannerAction(id: string): void {
    this.activeFolder.pipe(first()).subscribe(folder => {
      switch (id) {
        case 'login': {
          const returnUrl = this.router.url;
          this.router.navigate(['pages/terms'], { queryParams: { returnUrl } });
          break;
        }
        case 'follow':
          // Non-member adds (follows) the shared folder. followFolderSuccess
          // reloads the folder list.
          if (folder?.uuid) this.store.dispatch(FoldersActions.followFolder({ uuid: folder.uuid }));
          this.showSavedBanner();
          break;
        case 'copy': {
          // Follower copies the shared folder into their own library: a new
          // owned folder with the same name and a copy of all its items.
          this.commitDontShowIfPending();
          const items = (folder?.items ?? []).flat().map(item => item.id);
          if (folder?.name) {
            this.store.dispatch(FoldersActions.copyFolderToLibrary({ name: folder.name, items }));
          }
          this.showSavedBanner();
          break;
        }
        case 'remove':
          this.commitDontShowIfPending();
          if (folder?.uuid) this.store.dispatch(FoldersActions.unfollowFolder({ uuid: folder.uuid }));
          break;
      }
    });
  }

  onBannerDontShow(checked: boolean): void {
    // Only stash the choice; it is persisted later via commitDontShowIfPending
    // once the user triggers a banner action (Save/Remove).
    this.pendingDontShow.set(checked);
  }

  private commitDontShowIfPending(): void {
    if (this.pendingDontShow()) {
      this.dontShowAgain.setDontShowAgain(DontShowDialogs.SharedFolderBanner);
    }
  }

  private showSavedBanner(): void {
    this.savedBannerVisible.set(true);
    clearTimeout(this.savedBannerTimer);
    this.savedBannerTimer = setTimeout(() => this.savedBannerVisible.set(false), 5000);
  }

  folderDisplayName(folder: any): string {
    if (!folder) return '';
    return this.foldersService.isFavoritesFolder(folder)
      ? this.foldersService.getFavoritesDisplayName()
      : folder.name;
  }

  isFavoritesFolder(folder: any): boolean {
    return !!folder && this.foldersService.isFavoritesFolder(folder);
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
        tooltip: 'folder-toolbar.tooltip.delete',
        label: 'Delete'
      });
    }

    // Share action - always visible
    actions.push({
      id: 'share',
      icon: 'icon-send-2',
      tooltip: 'folder-toolbar.tooltip.share',
      label: 'Share',
    });

    // Download/Export action - always visible
    actions.push({
      id: 'download',
      icon: 'icon-download',
      tooltip: 'folder-toolbar.tooltip.download',
      label: 'Download'
    });

    return actions;
  }

  onShareFolder() {
    this.activeFolder.pipe(first()).subscribe(folder => {
      if (folder) {
        this.dialog.open(FolderShareDialogComponent, {
          panelClass: 'folder-share-dialog-panel',
          data: { uuid: folder.uuid, name: folder.name },
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
    this.activeFolderItems.pipe(first()).subscribe(items => {
      this.exportService.downloadSearchResultsCsv(items);
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

  onPlayAll(tracks: SoundTrackModel[]) {
    if (tracks && tracks.length > 0) {
      this.musicService.addTracksFromListToQueueAndPlayFirst(tracks[0], tracks);
    }
  }

  playAllTracks() {
    this.soundRecordingItems.pipe(first()).subscribe(tracks => {
      this.onPlayAll(tracks as SoundTrackModel[]);
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
