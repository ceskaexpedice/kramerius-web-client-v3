import { Injectable } from '@angular/core';
import { LocalStorageService } from './local-storage.service';

export enum DontShowDialogs {
  PlaybackStopDialog = 'playback-stop-dialog',
  FavoritesPopup = 'favorites-popup'
}

@Injectable({
  providedIn: 'root'
})
export class DontShowAgainService {
  private readonly storageKey = 'dont-show-again-dialogs';

  constructor(private localStorageService: LocalStorageService) {}

  /**
   * Check if dialog should be shown based on user preference
   */
  shouldShowDialog(dialogId: string): boolean {
    const preferences = this.getPreferences();
    return !preferences[dialogId];
  }

  /**
   * Set preference to not show dialog again
   */
  setDontShowAgain(dialogId: string): void {
    const preferences = this.getPreferences();
    preferences[dialogId] = true;
    this.localStorageService.set(this.storageKey, preferences);
  }

  /**
   * Reset preference to show dialog again
   */
  resetDialog(dialogId: string): void {
    const preferences = this.getPreferences();
    delete preferences[dialogId];
    this.localStorageService.set(this.storageKey, preferences);
  }

  /**
   * Clear all dialog preferences
   */
  clearAllPreferences(): void {
    this.localStorageService.remove(this.storageKey);
  }

  /**
   * Get all current preferences
   */
  private getPreferences(): Record<string, boolean> {
    return this.localStorageService.get<Record<string, boolean>>(this.storageKey) || {};
  }
}
