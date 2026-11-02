import {Component, computed, effect, ElementRef, inject, signal, viewChild} from '@angular/core';
import {SoundService} from '../../services/sound.service';
import {NgIf} from '@angular/common';
import {A11yModule} from '@angular/cdk/a11y';
import {TimeFormatPipe} from '../../pipes/time-format.pipe';
import {VolumeControlComponent} from './volume-control/volume-control.component';
import {PlaybackQueueComponent} from './playback-queue/playback-queue.component';
import {PlaybackQueueItemComponent} from './playback-queue/playback-queue-item.component';
import {TranslatePipe} from '@ngx-translate/core';
import {MusicService} from '../../../modules/music/services/music.service';
import {ThumbnailImageComponent} from '../thumbnail-image/thumbnail-image.component';
import {BreakpointService} from '../../services/breakpoint.service';
import {ToastService} from '../../services/toast.service';
import {FixedPanelEdgeDirective} from '../fixed-panel/fixed-panel-edge.directive';
import {SoundTrackModel} from '../../../modules/models/sound-track.model';

@Component({
  selector: 'app-playback-bar',
  imports: [
    NgIf,
    FixedPanelEdgeDirective,
    A11yModule,
    TimeFormatPipe,
    VolumeControlComponent,
    PlaybackQueueComponent,
    PlaybackQueueItemComponent,
    TranslatePipe,
    ThumbnailImageComponent,
  ],
  templateUrl: './playback-bar.component.html',
  styleUrl: './playback-bar.component.scss'
})
export class PlaybackBarComponent {
  isQueueOpen = signal(false);

  /** Phones: the "now playing" sheet (seek, previous, queue, close) behind the mini player. */
  isPlayerOpen = signal(false);

  volume = signal(1);
  show = computed(() => !!this.soundService.getCurrentTrack());

  public soundService = inject(SoundService);
  public musicService = inject(MusicService);
  public breakpointService = inject(BreakpointService);
  private toastService = inject(ToastService);

  private miniPlayerOpenButton = viewChild<ElementRef<HTMLButtonElement>>('miniPlayerOpen');

  /** Author and year of the current track, e.g. "Beethoven · 1952". */
  trackMeta = computed(() => {
    const track = this.soundService.getCurrentTrack();
    const author = track?.authors?.[0] || this.musicService.authorForTrack;
    const year = track?.year || this.musicService.metadata?.dateStr;
    return [author, year].filter(Boolean).join(' · ');
  });

  /**
   * Tracks queued besides the current one. A method, not a computed: the
   * service keeps the queue in a plain array, so a computed would miss removals.
   */
  upNext(): SoundTrackModel[] {
    const current = this.soundService.getCurrentTrack();
    const queue = this.soundService.getQueue();
    return current ? queue.filter(track => track.pid !== current.pid) : queue;
  }

  constructor() {
    // The sheet exists only on phones and only while something is loaded.
    effect(() => {
      if (!this.breakpointService.isMobile() || !this.show()) {
        this.isPlayerOpen.set(false);
      }
    });
  }

  toggleQueue() {
    this.isQueueOpen.set(!this.isQueueOpen());
  }

  openPlayer() {
    this.isPlayerOpen.set(true);
  }

  closePlayer() {
    this.isPlayerOpen.set(false);
    // Back to the control that opened the sheet, as the other sheets do.
    setTimeout(() => this.miniPlayerOpenButton()?.nativeElement.focus());
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
    this.isPlayerOpen.set(false);
    this.musicService.openMusicStopDialog();
    this.isQueueOpen.set(false);
  }

  openTrackDetails() {
    const track = this.soundService.getCurrentTrack();
    if (track) {
      this.isPlayerOpen.set(false);
      this.musicService.openTrackDetails(track);
    }
  }

  playFromQueue(track: SoundTrackModel) {
    this.soundService.play(track);
  }

  removeFromQueue(track: SoundTrackModel) {
    this.soundService.removeFromQueue(track.pid);
    this.toastService.show('track-removed-from-queue');
  }

}
