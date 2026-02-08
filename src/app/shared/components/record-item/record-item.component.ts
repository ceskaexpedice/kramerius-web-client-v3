import { Component, inject, Input, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, NgClass, NgIf } from '@angular/common';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Router } from '@angular/router';
import { RecordHandlerService } from '../../services/record-handler.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { SolrService } from '../../../core/solr/solr.service';
import { AccessibilityBadgeComponent } from '../accessibility-badge/accessibility-badge.component';
import { FavoritesPopupComponent } from '../favorites-popup/favorites-popup.component';
import { PopupPositioningService, PopupState } from '../../services/popup-positioning.service';
import { SelectionService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { Observable, EMPTY } from 'rxjs';
import { SavedListsService } from '../../../modules/saved-lists-page/services/saved-lists.service';
import { EnvironmentService } from '../../services/environment.service';
import { RecordItem } from './record-item.model';
import { FavoritesService } from '../../services/favorites.service';
import { ModelBadgeComponent } from '../model-badge/model-badge.component';
import { getLocalizedField } from '../../utils/language-utils';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';

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
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent implements OnInit, OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);
  favoritesService = inject(FavoritesService);
  popupPositioning = inject(PopupPositioningService);
  public selectionService = inject(SelectionService);
  private savedListsService = inject(SavedListsService);
  private envService = inject(EnvironmentService);
  private translateService = inject(TranslateService);

  private krameriusBaseUrl: string;

  @Input() showModel = true;
  @Input() layout: 'vertical' | 'horizontal' = 'vertical';
  @Input() variant: 'default' | 'author' = 'default';
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

  router = inject(Router);

  favoritesPopupState: PopupState;

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  constructor() {
    this.favoritesPopupState = this.favoritesService.createPopupState();
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  ngOnInit() {
    // Initialize the observable once we have the item
    if (this.item?.id) {
      this.isItemFavorited$ = this.favoritesService.getFavoritedStatus(this.item!.id);
    }
  }

  onRecordClick(e: MouseEvent): void {
    if (!this.item) return;
    if (this.selectionService.selectionMode()) {
      e.preventDefault();
      this.selectionService.toggleItem(this.item.id);
    } else if (this.item.externalUrl) {

    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    if (!this.item) return;
    if (selected) {
      this.selectionService.selectItem(this.item.id);
    } else {
      this.selectionService.deselectItem(this.item.id);
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
    if ((this.item.model === DocumentTypeEnum.page || this.item.model === DocumentTypeEnum.article) && this.item.ownParentPid) {
      return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.item.model, this.item.id, this.item.ownParentPid);
    }
    return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.item.model as DocumentTypeEnum, this.item.id);
  }

  getTitle(): string {
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

  onRemoveFromCurrentFolder(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.currentFolderId || !this.item) return;

    this.savedListsService.removeItemFromFolder(
      this.currentFolderId,
      this.item.id,
      this.item.title,
      () => {

      }
    );
  }

  // Helper methods
  isRecordLocked(): boolean {
    if (!this.item) return false;
    return this.recordHandler.isRecordLocked(this.item.licenses || []);
  }

  shouldShowAccessibilityBadge(): boolean {
    if (!this.item) return false;
    return this.item.showAccessibilityBadge === true && this.isRecordLocked();
  }

  shouldShowFavoriteButton(): boolean {
    if (!this.item) return false;
    return this.item.showFavoriteButton !== false && !this.selectionService.selectionMode();
  }

  getLocalizedCollectionDescription() {
    const text = getLocalizedField(this.item, 'collection.desc', this.translateService.getCurrentLang());

    return text;
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
