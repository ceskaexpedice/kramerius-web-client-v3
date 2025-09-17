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

  @Input() record: SearchDocument = {} as SearchDocument;
  @Input() currentFolderId?: string;

  router = inject(Router);

  favoritesPopupState: PopupState;

  // Observable to check if this item is in any folder
  isItemFavorited$: Observable<boolean> = EMPTY;

  constructor() {
    this.favoritesPopupState = this.popupPositioning.createPopupState();
  }

  ngOnInit() {
    // Initialize the observable once we have the record
    if (this.record?.pid) {
      this.isItemFavorited$ = this.folderItemsService.isItemInAnyFolder(this.record.pid);
    }
  }

  onRecordClick(e: MouseEvent, record: SearchDocument): void {
    console.log(e, record);
    if (this.selectionService.selectionMode()) {
      e.preventDefault();
      this.selectionService.toggleItem(record.pid);
    } else {
      this.recordHandler.onNavigate(e, this.getDocumentUrl());
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.selectionService.selectItem(this.record.pid);
    } else {
      this.selectionService.deselectItem(this.record.pid);
    }
  }

  getImageThumbnailUrl(): string {
    return this.solrService.getImageThumbnailUrl(this.record.pid);
  }

  getDocumentUrl() {

    if (this.record.model === DocumentTypeEnum.page) {
      return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.record.model, this.record.pid, this.record.ownParentPid);
    }

    return this.recordHandler.getHandleDocumentUrlByModelAndPid(this.record.model, this.record.pid, null);
  }

  getTitle(): string {
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

  getSubtitle() {
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

    this.savedListsService.removeItemFromFolder(
      this.currentFolderId,
      this.record.pid,
      this.record.title,
      () => {

      }
    );
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
