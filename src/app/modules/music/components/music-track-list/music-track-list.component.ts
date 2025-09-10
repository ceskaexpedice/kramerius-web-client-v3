import {Component, EventEmitter, Input, Output, OnDestroy, signal, inject} from '@angular/core';
import {MusicTrackItemComponent} from "../music-track-item/music-track-item.component";
import {NgForOf} from "@angular/common";
import {TranslatePipe} from '@ngx-translate/core';
import {FavoritesPopupComponent} from '../../../../shared/components/favorites-popup/favorites-popup.component';
import {PopupPositioningService, PopupState} from '../../../../shared/services/popup-positioning.service';
import {TrackViewType} from '../../../models/sound-track.model';

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

  @Output() select = new EventEmitter<any>();
  @Output() favoriteToggled = new EventEmitter<any>();
  @Output() addToQueue = new EventEmitter<any>();
  @Output() download = new EventEmitter<any>();
  @Output() remove = new EventEmitter<any>();

  popupPositioning = inject(PopupPositioningService);
  favoritesPopupState: PopupState;
  currentTrackId = signal<string>('');
  currentTrackName = signal<string>('');

  constructor() {
    this.favoritesPopupState = this.popupPositioning.createPopupState();
  }

  onSelect(track: any) {
    this.select.emit(track);
  }

  onFavoriteToggled(data: {track: any, event: Event}) {
    // Set current track
    this.currentTrackId.set(data.track.pid);
    this.currentTrackName.set(data.track['title.search'] || '');

    // Show and position popup
    this.popupPositioning.showPopup(this.favoritesPopupState, {
      triggerEvent: data.event,
      popupWidth: 265,
      popupHeight: 400,
      preferredSide: 'right'
    });
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
