import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from "@angular/common";
import {SoundTrackModel} from '../../../models/sound-track.model';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: '[app-music-track-item]',
  imports: [
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './music-track-item.component.html',
  styleUrls: ['./music-track-item.component.scss', '../music-track-list-table.scss'],
  standalone: true
})
export class MusicTrackItemComponent {

  isMouseOverFavorite = false;

  @Input() track!: SoundTrackModel;
  @Input() index: number = 0;
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;
  @Input() favoritedPids: string[] = [];

  @Output() trackSelected = new EventEmitter<SoundTrackModel>();
  @Output() addToQueueClicked = new EventEmitter<SoundTrackModel>();
  @Output() toggleFavoriteClicked = new EventEmitter<{track: SoundTrackModel, event: Event}>();
  @Output() downloadClicked = new EventEmitter<SoundTrackModel>();

  get isSelected(): boolean {
    return this.track?.pid === this.selectedPid;
  }

  get isPlaying(): boolean {
    return this.track?.pid === this.playingPid;
  }

  get isFavorited(): boolean {
    return this.favoritedPids.includes(this.track?.pid);
  }

  get duration(): string {
    const seconds = this.track?.['track.length'] ?? 0;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  get pageReference(): string {
    return ''
    //return this.track?.['page.number'] ? `Strana ${this.track['page.number']}` : '';
  }

  select(): void {
    this.trackSelected.emit(this.track);
  }

  addToQueue(): void {
    this.addToQueueClicked.emit(this.track);
  }

  toggleFavorite(event: Event): void {
    this.toggleFavoriteClicked.emit({track: this.track, event});
  }

  download(): void {
    this.downloadClicked.emit(this.track);
  }
}
