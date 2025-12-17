import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { LocalStorageService } from './local-storage.service';
import { AppConfigService, AppConfig } from './app-config.service';
import { EnvironmentService } from './environment.service';
import * as AuthActions from '../../core/auth/store/auth.actions';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppLoaderService {

  private store = inject(Store);
  private storage = inject(LocalStorageService);
  private http = inject(HttpClient);
  private appConfig = inject(AppConfigService);
  private env = inject(EnvironmentService);

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

      // 4. Other initialization tasks can be added here
      await this.loadAppConfig();

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
   * Load app-wide configuration from Kramerius API
   * Fetches configuration including pdfMaxRange, version, etc.
   */
  private async loadAppConfig(): Promise<void> {
    try {
      const language = this.storage.get('language') || 'cs';
      const apiUrl = this.env.getApiUrl(`info?language=${language}`);

      const config = await firstValueFrom(this.http.get<AppConfig>(apiUrl));

      this.appConfig.setConfig(config);
    } catch (error) {
      console.error('AppLoaderService: Failed to load API configuration, using defaults', error);
      // AppConfigService already has default values, so we don't need to do anything
    }
  }
}
