import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {forkJoin, of} from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import {
  loadMusic,
  loadMusicSuccess,
  loadMusicFailure
} from './music-detail.actions';
import {SolrService} from "../../../core/solr/solr.service";
import {SoundTrackModel} from '../../models/sound-track.model';

@Injectable()
export class MusicDetailEffects {

  private actions$ = inject(Actions);
  private solrService = inject(SolrService);

  loadMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMusic),
      mergeMap(({ uuids }) => {
        const requests = uuids.map((uuid: string) =>
          this.solrService.getChildrenByModel(uuid, 'rels_ext_index.sort asc', 'track')
        );
        return forkJoin(requests).pipe(
          map(results => {
            const mergedTracks = results.flat();
            mergedTracks.forEach((track: SoundTrackModel) => track.url = this.solrService.getAudioTrackMp3Url(track.pid));
            return loadMusicSuccess({ tracks: mergedTracks, document: null, metadata: null });
          }),
          catchError(error => of(loadMusicFailure({ error })))
        );
      })
    )
  );

}
