import {inject, Injectable, signal} from '@angular/core';
import {SoundTrackModel} from '../../modules/models/sound-track.model';
import {SolrService} from '../../core/solr/solr.service';

@Injectable({
  providedIn: 'root'
})
export class SoundService {
  private audio = new Audio();

  private queue: SoundTrackModel[] = [];
  private currentIndex = signal<number>(-1);
  private isPlaying = signal(false);
  private currentTime = signal(0);
  private duration = signal(0);
  private progress = signal(0);

  private solrService = inject(SolrService);

  constructor() {
    this.audio.addEventListener('timeupdate', () => {
      this.currentTime.set(this.audio.currentTime);
      this.progress.set(this.audio.currentTime / this.audio.duration);
    });

    this.audio.addEventListener('ended', () => {
      this.next();
    });

    this.audio.addEventListener('loadedmetadata', () => {
      this.duration.set(this.audio.duration);
    });
  }

  get currentTrack() {
    return this.queue[this.currentIndex()];
  }

  get currentTrackPid() {
    return this.currentTrack ? this.currentTrack.pid : null;
  }

  getCurrentTime = this.currentTime.asReadonly();
  getDuration = this.duration.asReadonly();
  getProgress = this.progress.asReadonly();
  isPlayingSignal = this.isPlaying.asReadonly();

  play(track?: SoundTrackModel) {
    if (track) {
      const index = this.queue.findIndex(t => t.pid === track.pid);
      if (index !== -1) {
        this.currentIndex.set(index);
      } else {
        this.queue.push(track);
        this.currentIndex.set(this.queue.length - 1);
      }
      this.loadAndPlay(track.url);
    } else if (this.audio.src) {
      this.audio.play();
      this.isPlaying.set(true);
    }
  }

  pause() {
    this.audio.pause();
    this.isPlaying.set(false);
  }

  togglePlayPause() {
    this.isPlaying() ? this.pause() : this.play();
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying.set(false);
  }

  next() {
    const nextIndex = this.currentIndex() + 1;
    if (nextIndex < this.queue.length) {
      this.currentIndex.set(nextIndex);
      this.loadAndPlay(this.queue[nextIndex].url);
    } else {
      this.stop();
    }
  }

  previous() {
    const prevIndex = this.currentIndex() - 1;
    if (prevIndex >= 0) {
      this.currentIndex.set(prevIndex);
      this.loadAndPlay(this.queue[prevIndex].url);
    }
  }

  seekTo(seconds: number) {
    this.audio.currentTime = seconds;
  }

  addToQueue(track: SoundTrackModel) {
    this.queue.push(track);
  }

  addTracksToQueue(tracks: SoundTrackModel[]) {
    this.queue.push(...tracks);
    if (this.currentIndex() === -1 && tracks.length > 0) {
      this.currentIndex.set(0);
      this.loadAndPlay(tracks[0].url);
    }
  }

  removeFromQueue(trackId: string) {
    const index = this.queue.findIndex(t => t.pid === trackId);
    if (index !== -1) {
      this.queue.splice(index, 1);
      if (index === this.currentIndex()) {
        this.stop();
      }
    }
  }

  clearQueue() {
    this.queue = [];
    this.stop();
    this.currentIndex.set(-1);
  }

  private loadAndPlay(url: string) {
    this.audio.src = url;
    this.audio.load();
    this.audio.play();
    this.isPlaying.set(true);
  }

  getQueue(): SoundTrackModel[] {
    return [...this.queue];
  }

  getCurrentTrack(): SoundTrackModel | null {
    return this.currentTrack || null;
  }

  getImageThumbnailUrl(pid: string): string {
    return this.solrService.getImageThumbnailUrl(pid);
  }

  getCurrentIndex(): number {
    return this.currentIndex();
  }
}
