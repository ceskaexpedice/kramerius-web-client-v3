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

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    TranslatePipe,
    AccessibilityBadgeComponent,
    FavoritesPopupComponent,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent implements OnDestroy {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);

  @Input() record: SearchDocument = {} as SearchDocument;
  @Input() currentFolderId?: string;

  router = inject(Router);

  showFavoritesPopup = signal(false);
  popupPositioned = signal(false);

  // Static reference to track currently open popup
  private static currentOpenPopup: RecordItemComponent | null = null;
  private clickOutsideListener?: (event: Event) => void;

  onRecordClick(e: Event, record: SearchDocument): void {
    e.stopPropagation();
    // redirect to detail view with ?uuid=record.uuId
    this.recordHandler.handleDocumentClick(record)
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

    // Close any existing popup first
    if (RecordItemComponent.currentOpenPopup && RecordItemComponent.currentOpenPopup !== this) {
      RecordItemComponent.currentOpenPopup.onCloseFavoritesPopup();
    }

    // Get button position to position popup
    const button = event.target as HTMLElement;
    const rect = button.getBoundingClientRect();

    // Reset positioning state
    this.popupPositioned.set(false);
    this.showFavoritesPopup.set(true);

    // Set this as the currently open popup
    RecordItemComponent.currentOpenPopup = this;

    // Position popup below the button after it's shown
    setTimeout(() => {
      const popup = document.querySelector('.favorites-popup-wrapper') as HTMLElement;
      if (popup) {
        const popupWidth = 265; // Width of popup from CSS
        const viewportWidth = window.innerWidth;
        const spacing = 4;

        let leftPosition = rect.left; // Default: align left edge with button (show to right)

        // Check if popup would overflow viewport on the right
        if (rect.left + popupWidth > viewportWidth - 16) { // 16px margin from edge
          // Show to left side instead - align right edge with button
          leftPosition = rect.right - popupWidth;
        }

        // Ensure popup doesn't go off left edge of screen
        if (leftPosition < 16) {
          leftPosition = 16; // Minimum margin from left edge
        }

        popup.style.top = `${rect.bottom}px`;
        popup.style.left = `${leftPosition}px`;
        this.popupPositioned.set(true); // Show popup after positioning

        // Set up click outside listener
        this.setupClickOutsideListener();
      }
    }, 0);
  }

  private setupClickOutsideListener() {
    // Remove existing listener if any
    this.removeClickOutsideListener();

    // Add click listener to document
    this.clickOutsideListener = (event: Event) => {
      const target = event.target as Element;
      const popup = document.querySelector('.favorites-popup-wrapper');
      const heartButton = document.querySelector('.favorites-button');

      // Check if click is outside popup and not on the heart button
      if (popup && !popup.contains(target) && !heartButton?.contains(target)) {
        this.onCloseFavoritesPopup();
      }
    };

    // Add listener with a slight delay to prevent immediate closure
    setTimeout(() => {
      document.addEventListener('click', this.clickOutsideListener!, true);
    }, 100);
  }

  private removeClickOutsideListener() {
    if (this.clickOutsideListener) {
      document.removeEventListener('click', this.clickOutsideListener, true);
      this.clickOutsideListener = undefined;
    }
  }

  onCloseFavoritesPopup() {
    this.showFavoritesPopup.set(false);
    this.popupPositioned.set(false);

    // Remove click outside listener
    this.removeClickOutsideListener();

    // Clear the static reference if this was the current open popup
    if (RecordItemComponent.currentOpenPopup === this) {
      RecordItemComponent.currentOpenPopup = null;
    }
  }

  ngOnDestroy() {
    // Clean up listener when component is destroyed
    this.removeClickOutsideListener();
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
