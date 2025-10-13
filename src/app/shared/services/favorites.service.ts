import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { Observable } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import { LoginPromptDialogComponent } from '../dialogs/login-prompt-dialog/login-prompt-dialog.component';
import { FolderItemsService } from '../../modules/saved-lists-page/services/folder-items.service';
import { PopupPositioningService, PopupState } from './popup-positioning.service';

export interface FavoriteToggleResult {
  shouldShowPopup: boolean;
  popupState?: PopupState;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private folderItemsService = inject(FolderItemsService);
  private popupPositioning = inject(PopupPositioningService);

  /**
   * Handle favorite toggle action with authentication check
   * @param currentUrl - Current route URL for redirect after login
   * @param event - Click event for popup positioning
   * @param popupState - Popup state to manage
   * @returns Observable indicating whether to show popup
   */
  handleFavoriteToggle(
    currentUrl: string,
    event: Event,
    popupState: PopupState
  ): boolean {
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
          this.authService.login(currentUrl);
        }
      });
      return false;
    }

    // User is authenticated, show favorites popup
    this.popupPositioning.showPopup(popupState, {
      triggerEvent: event,
      popupWidth: 265,
      popupHeight: 400,
      preferredSide: 'right'
    });
    return true;
  }

  /**
   * Get favorited status for an item
   * @param itemId - Item ID to check
   * @returns Observable<boolean> indicating if item is in any folder
   */
  getFavoritedStatus(itemId: string): Observable<boolean> {
    return this.folderItemsService.isItemInAnyFolder(itemId);
  }

  /**
   * Create a popup state for favorites
   * @returns PopupState
   */
  createPopupState(): PopupState {
    return this.popupPositioning.createPopupState();
  }
}
