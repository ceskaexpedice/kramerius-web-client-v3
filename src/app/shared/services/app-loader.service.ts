import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { LocalStorageService } from './local-storage.service';
import * as AuthActions from '../../core/auth/store/auth.actions';
import * as FoldersActions from '../../modules/saved-lists-page/state/folders.actions';

@Injectable({
  providedIn: 'root'
})
export class AppLoaderService {

  private store = inject(Store);
  private storage = inject(LocalStorageService);

  /**
   * Main app initialization method
   * Handles all app startup logic in a coordinated way
   */
  async appInit(): Promise<void> {
    console.log('AppLoaderService: Starting app initialization');

    try {
      // 1. Check if we're in OAuth callback flow
      if (this.isOAuthCallback()) {
        console.log('AppLoaderService: OAuth callback detected, skipping auth status check');
        return;
      }

      // 2. Check authentication status for session restoration
      // Skip if user just logged out intentionally
      if (this.storage.get('intentional_logout')) {
        console.log('AppLoaderService: Skipping auth check after intentional logout');
        this.storage.remove('intentional_logout');
      } else {
        console.log('AppLoaderService: Checking authentication status');
        this.checkAuthStatus();
      }

      // 3. Load saved lists/folders for the entire app
      console.log('AppLoaderService: Loading saved lists');
      this.store.dispatch(FoldersActions.loadFolders());

      // 4. Other initialization tasks can be added here
      await this.loadAppConfig();

      console.log('AppLoaderService: App initialization completed');

    } catch (error) {
      console.error('AppLoaderService: App initialization failed:', error);
      throw error;
    }
  }

  /**
   * Detects if the current page load is part of an OAuth callback flow
   */
  private isOAuthCallback(): boolean {
    const currentPath = window.location.pathname;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we're on the callback route
    const isCallbackRoute = currentPath.includes('/auth/callback');
    
    // Check if we have an OAuth code parameter
    const hasCodeParam = urlParams.has('code');
    
    console.log('OAuth detection:', { currentPath, hasCodeParam, isCallbackRoute });
    
    return isCallbackRoute || hasCodeParam;
  }

  /**
   * Triggers authentication status check for session restoration
   */
  private checkAuthStatus(): void {
    this.store.dispatch(AuthActions.checkAuthStatus());
  }

  /**
   * Load app-wide configuration
   * Placeholder for future config loading needs
   */
  private async loadAppConfig(): Promise<void> {
    // Future: Load feature flags, app settings, etc.
    console.log('AppLoaderService: App config loaded');
  }
}