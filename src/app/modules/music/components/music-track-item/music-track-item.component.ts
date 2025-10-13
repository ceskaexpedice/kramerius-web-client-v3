import {Component, EventEmitter, inject, Input, Output} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {SoundTrackModel, TrackViewType} from '../../../models/sound-track.model';
import {TranslatePipe} from '@ngx-translate/core';
import {MusicService} from '../../services/music.service';
import {Observable, of} from 'rxjs';

@Component({
  selector: '[app-music-track-item]',
  imports: [
    NgIf,
    TranslatePipe,
    AsyncPipe,
    NgClass,
  ],
  templateUrl: './music-track-item.component.html',
  styleUrls: ['./music-track-item.component.scss', '../music-track-list-table.scss'],
  standalone: true
})
export class MusicTrackItemComponent {

  isMouseOverFavorite = false;

  public musicService = inject(MusicService);

  @Input() track!: SoundTrackModel;
  @Input() index: number = 0;
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;
  @Input() isFavorited$: Observable<boolean> | undefined;
  @Input() viewType: TrackViewType = TrackViewType.DEFAULT;

  @Output() trackSelected = new EventEmitter<SoundTrackModel>();
  @Output() addToQueueClicked = new EventEmitter<SoundTrackModel>();
  @Output() toggleFavoriteClicked = new EventEmitter<{track: SoundTrackModel, event: Event}>();
  @Output() downloadClicked = new EventEmitter<SoundTrackModel>();
  @Output() removeClicked = new EventEmitter<SoundTrackModel>();

  get isSelected(): boolean {
    return this.track?.pid === this.selectedPid;
  }

  get isPlaying(): boolean {
    return this.track?.pid === this.playingPid;
  }

  get isFolderView(): boolean {
    return this.viewType === TrackViewType.FOLDER;
  }

  get showRemoveButton(): boolean {
    return this.isFolderView;
  }

  get primaryAuthor(): string {
    return this.track?.authors && this.track.authors.length > 0 ? this.track.authors[0] : '';
  }

  get trackYear(): string {
    return this.track?.year ? this.track.year.toString() : '';
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

  remove(): void {
    this.removeClicked.emit(this.track);
  }
}
