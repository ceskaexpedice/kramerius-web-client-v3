import { Injectable, inject } from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from "@angular/router";
import {
  selectMusicDocument, selectMusicError,
  selectMusicLoading,
  selectMusicMetadata,
  selectMusicTracks
} from "../state/music-detail.selectors";
import {Store} from "@ngrx/store";
import {RecordHandlerService} from "../../../shared/services/record-handler.service";
import {loadMusic} from "../state/music-detail.actions";
import {filter} from "rxjs";
import {toSignal} from "@angular/core/rxjs-interop";
import {Page} from "../../../shared/models/page.model";

@Injectable({
  providedIn: 'root'
})
export class MusicService {
  uuid: string | null = null;

  private route = inject(ActivatedRoute);

  // Store selectors as observables
  document$ = this.store.select(selectMusicDocument);
  metadata$ = this.store.select(selectMusicMetadata);
  tracks$ = this.store.select(selectMusicTracks);
  loading$ = this.store.select(selectMusicLoading);
  error$ = this.store.select(selectMusicError);

  private documentSignal = toSignal(this.document$, { initialValue: null });
  private metadataSignal = toSignal(this.metadata$, { initialValue: null });

  constructor(
    private store: Store,
    private router: Router,
    private recordHandler: RecordHandlerService
  ) {
  }

  loadMusic(page: Page[]) {
    console.log('loadMusic', page);
    const uuids = page.map(p => p.pid);

    this.store.dispatch(loadMusic({ uuids }));
  }

  get document() {
    return this.documentSignal();
  }

  get metadata() {
    return this.metadataSignal();
  }

  goBackClicked(): void {
    //this.recordHandler.navi();
  }
}
