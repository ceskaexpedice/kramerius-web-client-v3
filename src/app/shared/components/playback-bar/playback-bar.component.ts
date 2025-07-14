import {Component, computed, signal} from '@angular/core';
import {SoundService} from '../../services/sound.service';
import {DatePipe, DecimalPipe, NgIf} from '@angular/common';
import {TimeFormatPipe} from '../../pipes/time-format.pipe';

@Component({
  selector: 'app-playback-bar',
  imports: [
    NgIf,
    DecimalPipe,
    DatePipe,
    TimeFormatPipe,
  ],
  templateUrl: './playback-bar.component.html',
  styleUrl: './playback-bar.component.scss'
})
export class PlaybackBarComponent {
  volume = signal(1);
  show = computed(() => !!this.soundService.getCurrentTrack());

  constructor(public soundService: SoundService) {}

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

  onVolumeChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const vol = parseFloat(input.value);
    this.volume.set(vol);
    this.soundService['audio'].volume = vol;
  }

  close() {
    this.soundService.stop();
  }

}
