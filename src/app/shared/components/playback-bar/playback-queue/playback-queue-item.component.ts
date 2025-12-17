import {Component, inject, Input, OnDestroy, OnInit, output, signal} from '@angular/core';
import {AsyncPipe, NgClass, NgIf} from '@angular/common';
import {SoundTrackModel} from '../../../../modules/models/sound-track.model';
import {SoundService} from '../../../services/sound.service';
import {FavoritesService} from '../../../services/favorites.service';
import {Observable, EMPTY} from 'rxjs';
import {Router} from '@angular/router';
import {PopupPositioningService, PopupState} from '../../../services/popup-positioning.service';
import {FavoritesPopupComponent} from '../../favorites-popup/favorites-popup.component';

@Component({
  selector: 'app-playback-queue-item',
  imports: [
    NgIf,
    AsyncPipe,
    NgClass,
    FavoritesPopupComponent,
  ],
  templateUrl: './playback-queue-item.component.html',
  styleUrl: './playback-queue-item.component.scss'
})
export class PlaybackQueueItemComponent implements OnInit, OnDestroy {
  @Input() track!: SoundTrackModel;
  @Input() isCurrentTrack = false;

  onPlay = output<SoundTrackModel>();
  onRemove = output<SoundTrackModel>();
  onTogglePlayPause = output<SoundTrackModel>();

  public soundService = inject(SoundService);
  private favoritesService = inject(FavoritesService);
  private popupPositioning = inject(PopupPositioningService);
  private router = inject(Router);

  favoritesPopupState: PopupState;
  isItemFavorited$: Observable<boolean> = EMPTY;
  currentTrackId = signal<string>('');
  currentTrackName = signal<string>('');

  constructor() {
    this.favoritesPopupState = this.favoritesService.createPopupState();
  }

  ngOnInit() {
    if (this.track.pid) {
      this.isItemFavorited$ = this.favoritesService.getFavoritedStatus(this.track.pid);
    }
  }

  ngOnDestroy() {
    this.popupPositioning.cleanup();
  }

  play() {
    this.onPlay.emit(this.track);
  }

  togglePlayPause() {
    this.onTogglePlayPause.emit(this.track);
  }

  remove(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.onRemove.emit(this.track);
  }

  toggleFavorite(event: Event) {
    event.preventDefault();
    event.stopPropagation();

    // Set current track context for the popup
    this.currentTrackId.set(this.track.pid);
    this.currentTrackName.set(this.track['title.search'] || '');

    // Handle favorite toggle with authentication check
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      event,
      this.favoritesPopupState
    );
  }
}
