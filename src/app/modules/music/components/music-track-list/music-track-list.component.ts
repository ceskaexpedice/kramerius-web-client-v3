import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MusicTrackItemComponent} from "../music-track-item/music-track-item.component";
import {NgForOf} from "@angular/common";

@Component({
  selector: 'app-music-track-list',
  imports: [
    MusicTrackItemComponent,
    NgForOf
  ],
  templateUrl: './music-track-list.component.html',
  styleUrl: './music-track-list.component.scss'
})
export class MusicTrackListComponent {
  @Input() tracks: any[] = [];
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;

  @Output() select = new EventEmitter<string>();
  @Output() favoriteToggled = new EventEmitter<any>();
  @Output() addToQueue = new EventEmitter<any>();
  @Output() download = new EventEmitter<any>();

  onSelect(pid: string) {
    this.select.emit(pid);
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
