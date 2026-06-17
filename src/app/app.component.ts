import { Component, computed, inject, OnInit, effect } from '@angular/core';
import { NavigationError, NavigationStart, Router } from '@angular/router';
import { isChunkLoadError, reloadOnceForChunkError } from './shared/services/chunk-reload.util';
import { SoundService } from './shared/services/sound.service';
import { AppLoaderService } from './shared/services/app-loader.service';
import { AccessibilityService } from './shared/services/accessibility.service';
import { ErrorDialogService } from './shared/services/error-dialog.service';
import { UiStateService } from './shared/services/ui-state.service';
import { LibraryContextService } from './shared/services/library-context.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  private router = inject(Router);
  private libraryContext = inject(LibraryContextService);
  private soundService = inject(SoundService);
  private appLoader = inject(AppLoaderService);
  private accessibilityService = inject(AccessibilityService);
  private errorDialogService = inject(ErrorDialogService);
  private uiState = inject(UiStateService);

  showPlaybackBar = computed(() => !!this.soundService.getCurrentTrack());

  playbackBarHeight = computed(() => this.showPlaybackBar() ? 'var(--playback-bar-height-value)' : '0px');

  constructor() {
    effect(() => {
      if (this.uiState.headerVisible()) {
        document.body.classList.remove('header-hidden');
      } else {
        document.body.classList.add('header-hidden');
      }
    });
  }

  ngOnInit() {
    //TODO: remove this for production. This is just for testing CI pipeline
    console.log('AppComponent ngOnInit, branch: dev');

    if (!localStorage.getItem('CDK_DEV_KRAMERIUS_ID')) {
      localStorage.setItem('CDK_DEV_KRAMERIUS_ID', 'mzk');
    }

    // Recover from stale lazy-chunk loads after a new deploy. A failed lazy
    // route import() surfaces as a NavigationError (the router swallows the
    // promise rejection, so it never reaches the global ErrorHandler) — reload
    // once to pull the new chunk filenames.
    this.registerChunkErrorRecovery();

    // Auto-prefix navigations with the active library code when missing
    this.router.events.subscribe(event => {
      if (event instanceof NavigationStart && event.navigationTrigger === 'imperative') {
        const corrected = this.libraryContext.ensureLibraryPrefix(event.url);
        if (corrected) {
          this.router.navigateByUrl(corrected, { replaceUrl: true });
        }
      }
    });

    // Initialize app through centralized loader service
    this.appLoader.appInit().catch(error => {
      console.error('App initialization failed:', error);
    });
  }

  /**
   * Stale-chunk failures surface through several channels depending on what
   * triggered the import. We listen on all of them and share one single-reload
   * guard (see chunk-reload.util) so we never loop:
   *  - Router NavigationError: a lazy route (loadChildren/loadComponent) failed.
   *  - window 'unhandledrejection': a non-router dynamic import() rejected.
   *  - window 'error': a <script>/module element failed to load.
   * The global ErrorHandler (ChunkErrorHandler) remains as a final net.
   */
  private registerChunkErrorRecovery(): void {
    this.router.events.subscribe(event => {
      if (event instanceof NavigationError && isChunkLoadError(event.error)) {
        reloadOnceForChunkError();
      }
    });

    window.addEventListener('unhandledrejection', (event) => {
      if (isChunkLoadError(event.reason)) {
        reloadOnceForChunkError();
      }
    });

    window.addEventListener('error', (event) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        reloadOnceForChunkError();
      }
    });
  }

  // TEMPORARY: Test 500 error dialog
  testErrorDialog() {
    this.errorDialogService.openServerErrorDialog();
  }
}
