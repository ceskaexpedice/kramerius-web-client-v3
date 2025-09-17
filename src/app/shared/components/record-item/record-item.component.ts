import {Component, inject, Input, signal, OnDestroy, OnInit, computed} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgIf, AsyncPipe, NgClass} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {RecordHandlerService} from '../../services/record-handler.service';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';
import {SolrService} from '../../../core/solr/solr.service';
import {AccessibilityBadgeComponent} from '../accessibility-badge/accessibility-badge.component';
import {FavoritesPopupComponent} from '../favorites-popup/favorites-popup.component';
import {PopupPositioningService, PopupState} from '../../services/popup-positioning.service';
import {AuthService} from '../../../core/auth/auth.service';
import {MatDialog} from '@angular/material/dialog';
import {LoginPromptDialogComponent} from '../../dialogs/login-prompt-dialog/login-prompt-dialog.component';
import { SelectionService } from '../../services';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { FolderItemsService } from '../../../modules/saved-lists-page/services/folder-items.service';
import { Observable, EMPTY } from 'rxjs';
import {SavedListsService} from '../../../modules/saved-lists-page/services/saved-lists.service';
import { DocumentAccessibilityEnum } from '../../../modules/constants/document-accessibility';
import { EnvironmentService } from '../../services/environment.service';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    AsyncPipe,
    TranslatePipe,
    AccessibilityBadgeComponent,
    FavoritesPopupComponent,
    CheckboxComponent,
    NgClass,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent implements OnInit, OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);
  popupPositioning = inject(PopupPositioningService);
  authService = inject(AuthService);
  dialog = inject(MatDialog);
  public selectionService = inject(SelectionService);
  private folderItemsService = inject(FolderItemsService);
  private savedListsService = inject(SavedListsService);
  private envService = inject(EnvironmentService);

  private krameriusBaseUrl: string;

  // Original record-item inputs
  @Input() record: SearchDocument = {} as SearchDocument;
  @Input() currentFolderId?: string;

  // item-card compatibility inputs
  @Input() uuid?: string;
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() model?: string;
  @Input() link?: string | null = null;
  @Input() accessibility?: DocumentAccessibilityEnum = DocumentAccessibilityEnum.PUBLIC;
  @Input() licenses?: string[] = [];
  @Input() className?: string = '';
  @Input() showFavoriteButton?: boolean = true;
  @Input() showAccessibilityBadge?: boolean = false;

  router = inject(Router);

  favoritesPopupState: PopupState;

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  constructor() {
    this.favoritesPopupState = this.popupPositioning.createPopupState();
    this.krameriusBaseUrl = this.envService.getApiUrl('items');
  }

  ngOnInit() {
    // Initialize the observable once we have the record or uuid
    const itemId = this.getItemId();
    if (itemId) {
      this.isItemFavorited$ = this.folderItemsService.isItemInAnyFolder(itemId);
    }
  }

  onRecordClick(e: MouseEvent, record?: SearchDocument): void {
    const itemId = this.getItemId();
    if (this.selectionService.selectionMode()) {
      e.preventDefault();
      this.selectionService.toggleItem(itemId);
    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    const itemId = this.getItemId();
    if (selected) {
      this.selectionService.selectItem(itemId);
    } else {
      this.selectionService.deselectItem(itemId);
    }
  }

  getImageThumbnailUrl(): string {
    // Use item-card style URL if uuid is provided (for compatibility)
    if (this.uuid) {
      return this.krameriusBaseUrl + '/' + this.uuid + '/image/thumb';
    }
    // Use original record-item style URL
    return this.solrService.getImageThumbnailUrl(this.record.pid);
  }

  getDocumentUrl(): string {
    // Use item-card compatibility mode
    if (this.uuid && this.model) {
      return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.model, this.uuid);
    }

    // Use original record-item mode
    if (this.record.model === DocumentTypeEnum.page) {
      return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.record.model, this.record.pid, this.record.ownParentPid);
    }

    return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.record.model, this.record.pid, null);
  }

  getTitle(): string {
    // Use item-card compatibility mode
    if (this.title) {
      return this.title;
    }

    // Use original record-item logic
    switch (this.record.model) {
      case DocumentTypeEnum.monograph:
        return this.record.title || '';
      case DocumentTypeEnum.periodical:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.periodicalvolume:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.article:
        return this.record.title || '';
      case DocumentTypeEnum.supplement:
        return this.record.title || '';
      case DocumentTypeEnum.page:
        return this.record.rootTitle || '';
      default:
        return this.record.rootTitle || '';
    }
  }

  getSubtitle(): string {
    // Use item-card compatibility mode
    if (this.subtitle !== undefined) {
      return this.subtitle;
    }

    // Use original record-item logic
    switch (this.record.model) {
      case DocumentTypeEnum.article:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.supplement:
        return this.record.rootTitle || '';
      default:
        return '';
    }
  }

  onToggleFavorites(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Check showFavoriteButton for item-card compatibility
    if (this.showFavoriteButton === false) return;

    // Check if user is authenticated
    if (!this.authService.hasValidToken()) {
      // Show login prompt dialog
      const dialogRef = this.dialog.open(LoginPromptDialogComponent, {
        width: '60vw',
        disableClose: false
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result === 'login') {
          // Redirect to login with current route as return URL
          this.authService.login(this.router.url);
        }
      });
      return;
    }

    // User is authenticated, show favorites popup
    this.popupPositioning.showPopup(this.favoritesPopupState, {
      triggerEvent: event,
      popupWidth: 265,
      popupHeight: 400,
      preferredSide: 'right'
    });
  }

  ngOnDestroy() {
    // Clean up popup positioning service
    this.popupPositioning.cleanup();
  }

  onRemoveFromCurrentFolder(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    if (!this.currentFolderId) return;

    const itemId = this.getItemId();
    const itemTitle = this.getTitle();

    this.savedListsService.removeItemFromFolder(
      this.currentFolderId,
      itemId,
      itemTitle,
      () => {

      }
    );
  }

  // Helper methods for compatibility
  getItemId(): string {
    return this.uuid || this.record?.pid || '';
  }

  getItemModel(): string {
    return this.model || this.record?.model || '';
  }

  getItemLicenses(): string[] {
    return this.licenses || this.record?.containsLicenses || this.record?.licenses || [];
  }

  isRecordLocked(): boolean {
    return this.recordHandler.isRecordLocked(this.getItemLicenses());
  }

  shouldShowAccessibilityBadge(): boolean {
    return this.showAccessibilityBadge === true && this.isRecordLocked();
  }

  shouldShowFavoriteButton(): boolean {
    return this.showFavoriteButton !== false && !this.selectionService.selectionMode();
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
  protected readonly DocumentAccessibilityEnum = DocumentAccessibilityEnum;
}
