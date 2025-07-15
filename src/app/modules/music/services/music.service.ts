import { Injectable, inject } from '@angular/core';
import {ActivatedRoute, Router} from "@angular/router";
import {
  selectMusicError,
  selectMusicLoading,
  selectMusicMetadata,
  selectMusicTracks
} from "../state/music-detail.selectors";
import {Store} from "@ngrx/store";
import {RecordHandlerService} from "../../../shared/services/record-handler.service";
import {loadMusic} from "../state/music-detail.actions";
import {toSignal} from "@angular/core/rxjs-interop";
import {Page} from "../../../shared/models/page.model";
import {SoundService} from '../../../shared/services/sound.service';
import {SolrService} from '../../../core/solr/solr.service';
import {SoundTrackModel} from '../../models/sound-track.model';

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  uuid: string | null = null;

  private route = inject(ActivatedRoute);
  private soundService = inject(SoundService);
  private solr = inject(SolrService);

  // Store selectors as observables
  metadata$ = this.store.select(selectMusicMetadata);
  tracks$ = this.store.select(selectMusicTracks);
  loading$ = this.store.select(selectMusicLoading);
  error$ = this.store.select(selectMusicError);

  private metadataSignal = toSignal(this.metadata$, { initialValue: null });
  private tracksSignal = toSignal(this.tracks$, { initialValue: [] });

  constructor(
    private store: Store,
    private router: Router,
    private recordHandler: RecordHandlerService
  ) {
  }

  loadMusic(page: Page[]) {
    const uuids = page.map(p => p.pid);

    this.store.dispatch(loadMusic({ uuids }));
  }

  get metadata() {
    return this.metadataSignal();
  }

  get authorForTrack() {
    if (this.metadata && this.metadata.authors.length > 0) {
      return this.metadata.authors[0].name;
    }
    return '';
  }

  get coverImageForTrack() {
    if (this.metadata && this.metadata.uuid) {
      return this.solr.getImageThumbnailUrl(this.metadata.uuid);
    }
    return '';
  }

  get tracks() {
    return this.tracksSignal();
  }

  trackSelected(track: SoundTrackModel) {
    console.log('trackSelected', track);
    this.soundService.play(track)
  }

  addTracksToQueueAndPlayFirst(track: SoundTrackModel): void {

    if (!this.tracks || this.tracks.length === 0) {
      console.warn('No tracks available to add to queue.');
      return;
    }

    // find the index of the track in the tracks array
    const index = this.tracks.findIndex((t: any) => t.pid === track.pid);

    // if track is found add all tracks after it to the queue
    if (index !== undefined && index >= 0) {
      this.soundService.clearQueue();

      const tracksToAdd = this.tracks.slice(index);
      if (tracksToAdd && tracksToAdd.length > 0) {
        this.soundService.addTracksToQueue(tracksToAdd);
        this.soundService.play(tracksToAdd[0]);
      }
    }
  }

  addTrackToQueue(track: SoundTrackModel): void {
    this.soundService.addToQueue(track);
  }

  downloadTrack(track: SoundTrackModel): void {
    if (track && track.url) {
      const link = document.createElement('a');
      link.href = track.url;
      link.download = 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  goBackClicked(): void {
    //this.recordHandler.navi();
  }
}
