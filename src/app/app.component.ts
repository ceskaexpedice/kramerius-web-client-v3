import {Component, computed, inject, OnInit} from '@angular/core';
import {SoundService} from './shared/services/sound.service';
import {AppLoaderService} from './shared/services/app-loader.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  private soundService = inject(SoundService);
  private appLoader = inject(AppLoaderService);

  showPlaybackBar = computed(() => !!this.soundService.getCurrentTrack());

  ngOnInit() {
    //TODO: remove this for production. This is just for testing CI pipeline
    console.log('AppComponent ngOnInit, branch: dev');

    // Initialize app through centralized loader service
    this.appLoader.appInit().catch(error => {
      console.error('App initialization failed:', error);
    });
  }
}
