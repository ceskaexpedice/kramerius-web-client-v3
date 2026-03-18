import { Component, computed, inject, OnInit, effect } from '@angular/core';
import { NavigationStart, Router } from '@angular/router';
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

  playbackBarHeight = computed(() => this.showPlaybackBar() ? '52px' : '0px');
  dnntoBarHeight = computed(() => this.uiState.dnntoBarVisible() ? '38px' : '0px');

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

  // TEMPORARY: Test 500 error dialog
  testErrorDialog() {
    this.errorDialogService.openServerErrorDialog();
  }
}
