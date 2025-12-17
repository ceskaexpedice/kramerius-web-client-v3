import {Component, computed, inject, signal} from '@angular/core';
import {SoundService} from '../../services/sound.service';
import {NgIf} from '@angular/common';
import {TimeFormatPipe} from '../../pipes/time-format.pipe';
import {VolumeControlComponent} from './volume-control/volume-control.component';
import {PlaybackQueueComponent} from './playback-queue/playback-queue.component';
import {TranslatePipe} from '@ngx-translate/core';
import {MusicService} from '../../../modules/music/services/music.service';

@Component({
  selector: 'app-playback-bar',
  imports: [
    NgIf,
    TimeFormatPipe,
    VolumeControlComponent,
    PlaybackQueueComponent,
    TranslatePipe,
  ],
  templateUrl: './playback-bar.component.html',
  styleUrl: './playback-bar.component.scss'
})
export class PlaybackBarComponent {
  isQueueOpen = signal(false);

  volume = signal(1);
  show = computed(() => !!this.soundService.getCurrentTrack());

  public soundService = inject(SoundService);
  public musicService = inject(MusicService);

  toggleQueue() {
    this.isQueueOpen.set(!this.isQueueOpen());
  }

  togglePlay() {
    this.soundService.togglePlayPause();
  }

  next() {
    this.soundService.next();
  }

  prev() {
    this.soundService.previous();
  }

  seekTo(event: Event) {
    const input = event.target as HTMLInputElement;
    const time = (parseFloat(input.value) / 100) * this.soundService.getDuration();
    this.soundService.seekTo(time);
  }

  onVolumeChange(volume: number) {
    this.soundService['audio'].volume = volume;
  }

  close() {
    this.musicService.openMusicStopDialog();
    this.isQueueOpen.set(false);
  }

  openTrackDetails() {
    const track = this.soundService.getCurrentTrack();
    if (track) {
      this.musicService.openTrackDetails(track);
    }
  }

}
