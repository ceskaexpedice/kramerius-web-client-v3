import { Component, inject, Input, OnDestroy, OnInit, signal } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { SolrService } from '../../../core/solr/solr.service';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { FavoritesPopupComponent } from '../favorites-popup/favorites-popup.component';
import { PopupPositioningService, PopupState } from '../../services/popup-positioning.service';
import { AdminModeService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { Observable, EMPTY, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { selectUserOwnedFolders } from '../../../modules/saved-lists-page/state';
import { SavedListsService } from '../../../modules/saved-lists-page/services/saved-lists.service';
import { EnvironmentService } from '../../services/environment.service';
import { RecordItem } from './record-item.model';
import { FavoritesService } from '../../services/favorites.service';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { ModelBadgeComponent } from '../model-badge/model-badge.component';
import { getLocalizedField } from '../../utils/language-utils';
import { Metadata, fromSolrToMetadata } from '../../models/metadata.model';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';
import { SlideUpPanelComponent } from '../slide-up-panel/slide-up-panel.component';
import { MetadataSection } from '../metadata-section/metadata-section';
import { PluralizePipe } from '../../pipes/pluralize.pipe';
import { CdkTooltipDirective } from '../../directives/cdk-tooltip/cdk-tooltip.directive';

@Component({
  selector: 'app-record-item',
  imports: [
    AsyncPipe,
    TranslatePipe,
    AccessibilityBadgeComponent,
    FavoritesPopupComponent,
    CheckboxComponent,
    NgClass,
    NgIf,
    ModelBadgeComponent,
    ThumbnailImageComponent,
    SlideUpPanelComponent,
    MetadataSection,
    PluralizePipe,
    CdkTooltipDirective,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent implements OnInit, OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);
  favoritesService = inject(FavoritesService);
  private folderItemsService = inject(FolderItemsService);
  popupPositioning = inject(PopupPositioningService);
  public adminModeService = inject(AdminModeService);
  private savedListsService = inject(SavedListsService);
  private store = inject(Store);
  private envService = inject(EnvironmentService);
  private translateService = inject(TranslateService);

  private krameriusBaseUrl: string;

  @Input() showModel = true;
  @Input() showPageTag = true;
  @Input() layout: 'auto' | 'vertical' | 'horizontal' = 'auto';
  @Input() variant: 'default' | 'portrait' = 'default';
  @Input() showAccessibilityBadge = true;
  @Input() loading = false;

  @Input() item: RecordItem | null | undefined = {
    id: '',
    title: '',
    model: '',
    licenses: [],
    className: '',
    showFavoriteButton: true,
    showAccessibilityBadge: false
  };
  @Input() currentFolderId?: string;

  // Mobile info bottom sheet
  infoSheetOpen = signal(false);
  infoSheetMetadata = signal<Metadata | null>(null);

  router = inject(Router);

  favoritesPopupState: PopupState;

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  // IDs of every folder that currently contains this item. Drives the trash
  // (remove) action: shown whenever the item is in at least one folder. When it
  // is in exactly one folder we remove immediately; when it is in several we
  // open the favorites popup in 'remove' mode so the user picks which to remove
  // from. Derived from the mapping, so it works anywhere (not only the
  // saved-lists page where currentFolderId is set).
  itemFolderIds$: Observable<string[]> = EMPTY;

  // Opens the favorites popup in remove mode instead of the default add mode.
  popupMode = signal<'add' | 'remove'>('add');

  constructor() {
    this.favoritesPopupState = this.favoritesService.createPopupState();
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  ngOnInit() {
    // Initialize the observable once we have the item
    if (this.item?.id) {
      this.isItemFavorited$ = this.favoritesService.getFavoritedStatus(this.item!.id);
      this.itemFolderIds$ = this.folderItemsService.getFolderIdsContainingItem(this.item!.id);
    }
  }

  onRecordClick(e: MouseEvent): void {
    if (!this.item) return;
    if (this.adminModeService.adminMode()) {
      e.preventDefault();
      this.adminModeService.toggleItem(this.item.id);
    } else if (this.item.externalUrl) {

    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    if (!this.item) return;
    if (selected) {
      this.adminModeService.selectItem(this.item.id);
    } else {
      this.adminModeService.deselectItem(this.item.id);
    }
  }

  getImageThumbnailUrl(): string {
    if (!this.item) return '';
    if (this.item.imageUrl) {
      return this.item.imageUrl;
    }
    // Use Kramerius API for thumbnail
    return this.krameriusBaseUrl + '/' + this.item.id + '/image/thumb';
  }

  getDocumentUrl(): string {
    if (!this.item) return '';
    if (this.item.externalUrl) {
      return this.item.externalUrl;
    }
    return this.recordHandler.getDocumentUrl({
      model: this.item.model,
      pid: this.item.id,
      ownParentPid: this.item.ownParentPid,
      ownParentModel: this.item.ownParentModel,
      fulltext: this.item.fulltext,
      grouped: this.item.grouped,
    });
  }

  getTitle(): string {
    // Collections carry localized title fields; resolve per current language at
    // render time so the card title follows language changes (like the description).
    if (this.item?.model === DocumentTypeEnum.collection) {
      const localized = getLocalizedField(this.item, 'title.search', this.translateService.getCurrentLang());
      if (localized) return localized;
    }
    return this.item?.title || '';
  }

  getSubtitle(): string {
    return this.item?.subtitle || '';
  }

  onToggleFavorites(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.item) return;

    if (this.item.showFavoriteButton === false) return;

    this.popupMode.set('add');

    // Handle favorite toggle with authentication check
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      event,
      this.favoritesPopupState
    );
  }

  ngOnDestroy() {
    // Clean up popup positioning service
    this.popupPositioning.cleanup();
  }

  onRemoveFromFolder(event: Event, folderIds: string[]) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.item || folderIds.length === 0) return;

    // Only the user's OWN folders can have items removed; followed/shared folders
    // aren't editable, so the single/multi decision must ignore them.
    this.store.select(selectUserOwnedFolders).pipe(take(1)).subscribe(ownedFolders => {
      const ownedFolderIds = new Set(ownedFolders.map(f => f.uuid));
      const ownedContaining = folderIds.filter(id => ownedFolderIds.has(id));

      if (ownedContaining.length === 0) return;

      // In a single owned folder: remove right away (with the standard confirmation).
      if (ownedContaining.length === 1) {
        this.savedListsService.removeItemFromFolder(
          ownedContaining[0],
          this.item!.id,
          this.item!.title,
          () => {}
        );
        return;
      }

      // In several owned folders: open the popup in remove mode so the user picks
      // which folders to remove the item from.
      this.popupMode.set('remove');
      this.favoritesService.handleFavoriteToggle(
        this.router.url,
        event,
        this.favoritesPopupState
      );
    });
  }

  onInfoClick(event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (!this.item) return;

    this.solrService.getDetailItem(this.item.id).pipe(take(1)).subscribe(solrDoc => {
      if (solrDoc) {
        this.infoSheetMetadata.set(fromSolrToMetadata(solrDoc));
      }
      this.infoSheetOpen.set(true);
    });
  }

  // Helper methods
  isRecordLocked(): boolean {
    if (!this.item) return false;
    return this.recordHandler.isRecordLocked(this.item.licenses || []);
  }

  shouldShowAccessibilityBadge(): boolean {
    if (!this.item) return false;
    return this.item.showAccessibilityBadge === true && this.showAccessibilityBadge;
  }

  shouldShowFavoriteButton(): boolean {
    if (!this.item) return false;
    return this.item.showFavoriteButton !== false && !this.adminModeService.adminMode();
  }

  getLocalizedCollectionDescription() {
    const text = getLocalizedField(this.item, 'collection.desc', this.translateService.getCurrentLang());

    return text;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
