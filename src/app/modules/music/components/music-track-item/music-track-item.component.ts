import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgIf} from "@angular/common";

@Component({
  selector: 'app-music-track-item',
  imports: [
    NgIf
  ],
  templateUrl: './music-track-item.component.html',
  styleUrl: './music-track-item.component.scss',
  standalone: true
})
export class MusicTrackItemComponent {
  @Input() track: any;
  @Input() index: number = 0;
  @Input() selectedPid: string | null = null;
  @Input() playingPid: string | null = null;
  @Input() favoritedPids: string[] = [];

  @Output() trackSelected = new EventEmitter<string>();
  @Output() addToQueueClicked = new EventEmitter<string>();
  @Output() toggleFavoriteClicked = new EventEmitter<string>();
  @Output() downloadClicked = new EventEmitter<string>();

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
    return this.track?.['page.number'] ? `Strana ${this.track['page.number']}` : '';
  }

  select(): void {
    this.trackSelected.emit(this.track?.pid);
  }

  addToQueue(): void {
    this.addToQueueClicked.emit(this.track?.pid);
  }

  toggleFavorite(): void {
    this.toggleFavoriteClicked.emit(this.track?.pid);
  }

  download(): void {
    this.downloadClicked.emit(this.track?.pid);
  }
}
