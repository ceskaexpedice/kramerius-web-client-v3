import {Component, computed, inject, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SoundService} from './shared/services/sound.service';
import {Store} from '@ngrx/store';
import * as AuthActions from './core/auth/store/auth.actions';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

  private soundService = inject(SoundService);
  private store = inject(Store);

  showPlaybackBar = computed(() => !!this.soundService.getCurrentTrack());

  ngOnInit() {
    //TODO: remove this for production. This is just for testing CI pipeline
    console.log('AppComponent ngOnInit, branch: dev');

    // Check authentication status on app initialization
    this.store.dispatch(AuthActions.checkAuthStatus());
  }
}
