import { Injectable, inject } from '@angular/core';
import { Store } from '@ngrx/store';
import * as AuthActions from '../../core/auth/store/auth.actions';

@Injectable({
  providedIn: 'root'
})
export class AppLoaderService {

  private store = inject(Store);

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
      console.log('AppLoaderService: Checking authentication status');
      this.checkAuthStatus();

      // 3. Other initialization tasks can be added here
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