import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {SoundTrackModel, TrackViewType} from '../../../models/sound-track.model';
import {TranslatePipe} from '@ngx-translate/core';
import {MusicService} from '../../services/music.service';
import {Observable, EMPTY} from 'rxjs';
import {FavoritesService} from '../../../../shared/services/favorites.service';
import {UserService} from '../../../../shared/services/user.service';
import {CdkTooltipDirective} from '../../../../shared/directives';
import {ThumbnailImageComponent} from '../../../../shared/components/thumbnail-image/thumbnail-image.component';

@Component({
  selector: '[app-music-track-item]',
  imports: [
    NgIf,
    TranslatePipe,
    AsyncPipe,
    NgClass,
    CdkTooltipDirective,
    ThumbnailImageComponent,
  ],
  templateUrl: './music-track-item.component.html',
  styleUrls: ['./music-track-item.component.scss', '../music-track-list-table.scss'],
  standalone: true
})
export class MusicTrackItemComponent implements OnInit {

  isMouseOverFavorite = false;

  public musicService = inject(MusicService);
  private favoritesService = inject(FavoritesService);
  private userService = inject(UserService);

  @Input() track!: SoundTrackModel;
  @Input() index: number = 0;
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;
  @Input() viewType: TrackViewType = TrackViewType.DEFAULT;

  @Output() trackSelected = new EventEmitter<SoundTrackModel>();
  @Output() addToQueueClicked = new EventEmitter<SoundTrackModel>();
  @Output() toggleFavoriteClicked = new EventEmitter<{track: SoundTrackModel, event: Event}>();
  @Output() downloadClicked = new EventEmitter<SoundTrackModel>();
  @Output() removeClicked = new EventEmitter<SoundTrackModel>();

  isFavorited$: Observable<boolean> = EMPTY;

  ngOnInit() {
    if (this.track?.pid) {
      this.isFavorited$ = this.favoritesService.getFavoritedStatus(this.track.pid);
    }
  }

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

  get canAccessTrack(): boolean {
    return this.userService.hasAnyLicense(this.track?.licenses_of_ancestors || []);
  }
}
