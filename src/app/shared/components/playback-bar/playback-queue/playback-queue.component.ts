import {Component, inject, signal} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {SoundService} from '../../../services/sound.service';
import {SoundTrackModel} from '../../../../modules/models/sound-track.model';
import {TranslatePipe} from '@ngx-translate/core';
import {ToastService} from '../../../services/toast.service';
import {ClickOutsideDirective} from '../../../directives/click-outside';
import {PlaybackQueueItemComponent} from './playback-queue-item.component';

@Component({
  selector: 'app-playback-queue',
  imports: [
    NgIf,
    NgForOf,
    TranslatePipe,
    ClickOutsideDirective,
    PlaybackQueueItemComponent,
  ],
  templateUrl: './playback-queue.component.html',
  styleUrl: './playback-queue.component.scss'
})
export class PlaybackQueueComponent {
  isOpen = signal(true);

  public soundService = inject(SoundService);
  private toastService = inject(ToastService);

  close() {
    if (this.isOpen()) {
      this.isOpen.set(false);
    }
  }

  getCurrentTrack(): SoundTrackModel | null {
    return this.soundService.getCurrentTrack();
  }

  getRemainingTracks(): SoundTrackModel[] {
    const currentTrack = this.getCurrentTrack();
    const queue = this.soundService.getQueue();

    if (!currentTrack) {
      return queue;
    }

    return queue.filter(track => track.pid !== currentTrack.pid);
  }

  onPlay(track: SoundTrackModel) {
    this.soundService.play(track);
  }

  onTogglePlayPause(track: SoundTrackModel) {
    if (this.soundService.isPlayingSignal()) {
      this.soundService.pause();
    } else {
      this.soundService.play();
    }
  }

  onRemove(track: SoundTrackModel) {
    this.soundService.removeFromQueue(track.pid);
    this.toastService.show('track-removed-from-queue');
  }
}
