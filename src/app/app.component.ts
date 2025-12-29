import { Component, computed, inject, OnInit, effect } from '@angular/core';
import { SoundService } from './shared/services/sound.service';
import { AppLoaderService } from './shared/services/app-loader.service';
import { AccessibilityService } from './shared/services/accessibility.service';
import { ErrorDialogService } from './shared/services/error-dialog.service';
import { UiStateService } from './shared/services/ui-state.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  private soundService = inject(SoundService);
  private appLoader = inject(AppLoaderService);
  private accessibilityService = inject(AccessibilityService);
  private errorDialogService = inject(ErrorDialogService);
  private uiState = inject(UiStateService);

  showPlaybackBar = computed(() => !!this.soundService.getCurrentTrack());

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
