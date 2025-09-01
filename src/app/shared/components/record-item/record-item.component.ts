import {Component, inject, Input, signal, OnDestroy} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgIf} from '@angular/common';
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
import { AdminSelectionService } from '../../services/admin-selection.service';
import { CheckboxComponent } from '../checkbox/checkbox.component';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    TranslatePipe,
    AccessibilityBadgeComponent,
    FavoritesPopupComponent,
    CheckboxComponent,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent implements OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);
  popupPositioning = inject(PopupPositioningService);
  authService = inject(AuthService);
  dialog = inject(MatDialog);
  adminSelectionService = inject(AdminSelectionService);

  @Input() record: SearchDocument = {} as SearchDocument;
  @Input() currentFolderId?: string;

  router = inject(Router);

  favoritesPopupState: PopupState;

  constructor() {
    this.favoritesPopupState = this.popupPositioning.createPopupState();
  }

  onRecordClick(e: Event, record: SearchDocument): void {
    if (this.adminSelectionService.adminMode()) {
      this.adminSelectionService.toggleItem(record.pid);
    } else {
      this.recordHandler.handleDocumentClick(record);
    }
  }

  onSelectionChange(selected: boolean): void {
    if (selected) {
      this.adminSelectionService.selectItem(this.record.pid);
    } else {
      this.adminSelectionService.deselectItem(this.record.pid);
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

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
