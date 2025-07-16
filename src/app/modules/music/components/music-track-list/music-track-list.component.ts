import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MusicTrackItemComponent} from "../music-track-item/music-track-item.component";
import {NgForOf} from "@angular/common";
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-music-track-list',
  imports: [
    MusicTrackItemComponent,
    NgForOf,
    TranslatePipe,
  ],
  templateUrl: './music-track-list.component.html',
  styleUrls: ['./music-track-list.component.scss', '../music-track-list-table.scss'],
})
export class MusicTrackListComponent {
  @Input() tracks: any[] = [];
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;

  @Output() select = new EventEmitter<any>();
  @Output() favoriteToggled = new EventEmitter<any>();
  @Output() addToQueue = new EventEmitter<any>();
  @Output() download = new EventEmitter<any>();

  onSelect(track: any) {
    this.select.emit(track);
  }

  onFavoriteToggled(track: any) {
    this.favoriteToggled.emit(track);
  }

  onAddToQueue(track: any) {
    this.addToQueue.emit(track);
  }

  onDownload(track: any) {
    this.download.emit(track);
  }
}
