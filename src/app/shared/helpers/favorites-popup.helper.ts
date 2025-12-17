import { signal, Signal } from '@angular/core';
import { Router } from '@angular/router';
import { FavoritesService } from '../services/favorites.service';
import { PopupPositioningService, PopupState } from '../services/popup-positioning.service';
import { Observable } from 'rxjs';
import { Metadata } from '../models/metadata.model';

/**
 * Helper class to manage favorites popup functionality
 * Encapsulates all favorites popup logic to avoid code duplication
 */
export class FavoritesPopupHelper {
  // Favorites popup state
  public favoritesPopupState: PopupState;
  public currentItemId = signal<string>('');
  public currentItemName = signal<string>('');
  public showHierarchySelector = signal<boolean>(false);

  constructor(
    private favoritesService: FavoritesService,
    private popupPositioning: PopupPositioningService,
    private router: Router
  ) {
    this.favoritesPopupState = this.favoritesService.createPopupState();
  }

  /**
   * Handle favorites button click
   * @param event - Click event for popup positioning
   * @param document$ - Observable or value of the current document
   * @param showHierarchy - Whether to show hierarchy selector
   */
  onFavoritesClicked(
    event: Event,
    document$: Observable<Metadata | null> | Metadata | null,
    showHierarchy: boolean = false
  ): void {
    // Handle both Observable and direct value
    if (this.isObservable(document$)) {
      const subscription = (document$ as Observable<Metadata | null>).subscribe(document => {
        if (!document) return;
        this.setDocumentContext(document, showHierarchy, event);
      });
      subscription.unsubscribe();
    } else if (document$) {
      this.setDocumentContext(document$ as Metadata, showHierarchy, event);
    }
  }

  /**
   * Set the document context and show the popup
   */
  private setDocumentContext(document: Metadata, showHierarchy: boolean, event: Event): void {
    // Set current item context
    this.currentItemId.set(document.uuid);
    this.currentItemName.set(document.mainTitle || '');

    // Set hierarchy selector visibility
    this.showHierarchySelector.set(showHierarchy);

    // Handle favorite toggle with authentication check
    // Use 480px width when hierarchy selector is shown, otherwise 265px
    const popupWidth = showHierarchy ? 480 : 265;
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      event,
      this.favoritesPopupState,
      popupWidth
    );
  }

  /**
   * Close the favorites popup
   */
  onFavoritesPopupClose(): void {
    this.favoritesPopupState.showPopup.set(false);
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.popupPositioning.cleanup();
  }

  /**
   * Type guard to check if value is Observable
   */
  private isObservable(value: any): value is Observable<any> {
    return value && typeof value.subscribe === 'function';
  }
}
