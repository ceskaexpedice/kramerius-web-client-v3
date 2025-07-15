import {Component, computed, inject} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {SoundService} from './shared/services/sound.service';

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {

  private soundService = inject(SoundService);

  showPlaybackBar = computed(() => !!this.soundService.getCurrentTrack());

  ngOnInit() {
    //TODO: remove this for production. This is just for testing CI pipeline
    console.log('AppComponent ngOnInit, branch: dev');
  }
}
