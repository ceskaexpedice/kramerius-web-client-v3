import {Component, EventEmitter, Input, Output, OnDestroy, signal, inject} from '@angular/core';
import {MusicTrackItemComponent} from "../music-track-item/music-track-item.component";
import {NgForOf} from "@angular/common";
import {TranslatePipe} from '@ngx-translate/core';
import {FavoritesPopupComponent} from '../../../../shared/components/favorites-popup/favorites-popup.component';
import {PopupPositioningService, PopupState} from '../../../../shared/services/popup-positioning.service';
import {TrackViewType} from '../../../models/sound-track.model';
import {Router} from '@angular/router';
import {FavoritesService} from '../../../../shared/services/favorites.service';
import {UserService} from '../../../../shared/services/user.service';

@Component({
  selector: 'app-music-track-list',
  imports: [
    MusicTrackItemComponent,
    NgForOf,
    TranslatePipe,
    FavoritesPopupComponent,
  ],
  templateUrl: './music-track-list.component.html',
  styleUrls: ['./music-track-list.component.scss', '../music-track-list-table.scss'],
})
export class MusicTrackListComponent implements OnDestroy {
  @Input() tracks: any[] = [];
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;
  @Input() currentFolderId?: string;
  @Input() viewType: TrackViewType = TrackViewType.DEFAULT;
  @Input() accessDenied = false;

  @Output() select = new EventEmitter<any>();
  @Output() playAll = new EventEmitter<any[]>();
  @Output() scrollToAccessDenied = new EventEmitter<void>();
  @Output() favoriteToggled = new EventEmitter<any>();
  @Output() addToQueue = new EventEmitter<any>();
  @Output() download = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();

  popupPositioning = inject(PopupPositioningService);
  favoritesService = inject(FavoritesService);
  router = inject(Router);
  private userService = inject(UserService);

  favoritesPopupState: PopupState;
  currentTrackId = signal<string>('');
  currentTrackName = signal<string>('');

  constructor() {
    this.favoritesPopupState = this.favoritesService.createPopupState();
  }

  isTrackDisabled(track: any): boolean {
    return !this.userService.hasAnyLicense(track?.licenses_of_ancestors || []);
  }

  onSelect(track: any) {
    if (this.isTrackDisabled(track)) {
      return;
    }
    this.select.emit(track);
  }

  onPlayAll() {
    this.playAll.emit(this.tracks);
  }

  onScrollToAccessDenied() {
    this.scrollToAccessDenied.emit();
  }

  onFavoriteToggled(data: {track: any, event: Event}) {
    // Set current track
    this.currentTrackId.set(data.track.pid);
    this.currentTrackName.set(data.track['title.search'] || '');

    // Handle favorite toggle with authentication check
    this.favoritesService.handleFavoriteToggle(
      this.router.url,
      data.event,
      this.favoritesPopupState
    );
  }

  ngOnDestroy() {
    // Clean up popup positioning service
    this.popupPositioning.cleanup();
  }

  onAddToQueue(track: any) {
    this.addToQueue.emit(track);
  }

  onDownload(track: any) {
    this.download.emit(track);
  }

  onRemove(track: any) {
    this.remove.emit(track);
  }
}
