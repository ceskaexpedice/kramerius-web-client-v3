import { inject, Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { Store } from '@ngrx/store';
import {forkJoin, of} from 'rxjs';
import {catchError, map, mergeMap, withLatestFrom} from 'rxjs/operators';
import {
  loadMusic,
  loadMusicSuccess,
  loadMusicFailure
} from './music-detail.actions';
import {SolrService} from "../../../core/solr/solr.service";
import {SoundTrackModel} from '../../models/sound-track.model';
import {selectDocumentDetail} from '../../../shared/state/document-detail/document-detail.selectors';

@Injectable()
export class MusicDetailEffects {

  private actions$ = inject(Actions);
  private solrService = inject(SolrService);
  private store = inject(Store);

  loadMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMusic),
      withLatestFrom(this.store.select(selectDocumentDetail)),
      mergeMap(([{ uuids }, metadata]) => {
        const requests = uuids.map((uuid: string) =>
          this.solrService.getChildrenByModel(uuid, 'rels_ext_index.sort asc', 'track').pipe(
            map(tracks => ({ uuid, tracks }))
          )
        );


        return forkJoin(requests).pipe(
          map(results => {
            const mergedTracks: SoundTrackModel[] = [];

            results.forEach(({ uuid, tracks }, uuidIndex) => {
              tracks.forEach((track: any, trackIndex: number) => {
                track.part = `${uuidIndex + 1}.${trackIndex + 1}`;
                track.url = this.solrService.getAudioTrackMp3Url(track.pid);
                track.parentPid = uuid;
                mergedTracks.push(track);
              });
            });

            return loadMusicSuccess({ tracks: mergedTracks, metadata });
          }),
          catchError(error => of(loadMusicFailure({ error })))
        );
      })
    )
  );

}
