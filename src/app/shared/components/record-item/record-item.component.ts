import {Component, inject, Input, OnDestroy, OnInit} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {RecordHandlerService} from '../../services/record-handler.service';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';
import {SolrService} from '../../../core/solr/solr.service';
import {AccessibilityBadgeComponent} from '../accessibility-badge/accessibility-badge.component';
import {FavoritesPopupComponent} from '../favorites-popup/favorites-popup.component';
import {PopupPositioningService, PopupState} from '../../services/popup-positioning.service';
import { SelectionService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { Observable, EMPTY } from 'rxjs';
import {SavedListsService} from '../../../modules/saved-lists-page/services/saved-lists.service';
import { EnvironmentService } from '../../services/environment.service';
import { RecordItem } from './record-item.model';
import { FavoritesService } from '../../services/favorites.service';

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

  private krameriusBaseUrl: string;

  @Input() item: RecordItem = {
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
    if (this.item.id) {
      this.isItemFavorited$ = this.favoritesService.getFavoritedStatus(this.item.id);
    }
  }

  onRecordClick(e: MouseEvent): void {
    if (this.selectionService.selectionMode()) {
      e.preventDefault();
      this.selectionService.toggleItem(this.item.id);
    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.selectionService.selectItem(this.item.id);
    } else {
      this.selectionService.deselectItem(this.item.id);
    }
  }

  getImageThumbnailUrl(): string {
    // Use Kramerius API for thumbnail
    return this.krameriusBaseUrl + '/' + this.item.id + '/image/thumb';
  }

  getDocumentUrl(): string {
    if ((this.item.model === DocumentTypeEnum.page || this.item.model === DocumentTypeEnum.article) && this.item.ownParentPid) {
      return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.item.model, this.item.id, this.item.ownParentPid);
    }
    return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.item.model, this.item.id);
  }

  getTitle(): string {
    return this.item.title || '';
  }

  getSubtitle(): string {
    return this.item.subtitle || '';
  }

  onToggleFavorites(event: Event) {
    event.preventDefault();
    event.stopPropagation();

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

    if (!this.currentFolderId) return;

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
    return this.recordHandler.isRecordLocked(this.item.licenses || []);
  }

  shouldShowAccessibilityBadge(): boolean {
    return this.item.showAccessibilityBadge === true && this.isRecordLocked();
  }

  shouldShowFavoriteButton(): boolean {
    return this.item.showFavoriteButton !== false && !this.selectionService.selectionMode();
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
