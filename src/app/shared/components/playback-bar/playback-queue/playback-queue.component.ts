import {Component, signal} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {SoundService} from '../../../services/sound.service';
import {SoundTrackModel} from '../../../../modules/models/sound-track.model';

@Component({
  selector: 'app-playback-queue',
  imports: [
    NgIf,
    NgForOf,
  ],
  templateUrl: './playback-queue.component.html',
  styleUrl: './playback-queue.component.scss'
})
export class PlaybackQueueComponent {
  isOpen = signal(true); // could be controlled from outside too

  constructor(public soundService: SoundService) {}

  play(track: SoundTrackModel) {
    this.soundService.play(track);
  }

  remove(track: SoundTrackModel) {
    this.soundService.removeFromQueue(track.pid);
  }

  close() {
    this.isOpen.set(false);
  }

  isActive(track: SoundTrackModel): boolean {
    return this.soundService.getCurrentTrack()?.pid === track.pid;
  }
}
