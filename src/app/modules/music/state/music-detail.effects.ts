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

  // loadMusic$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(loadMusic),
  //     mergeMap(({ uuids }) => {
  //       const requests = uuids.map((uuid: string) =>
  //         this.solrService.getChildrenByModel(uuid, 'rels_ext_index.sort asc', 'track')
  //       );
  //
  //       console.log('requests', requests);
  //       return forkJoin(requests).pipe(
  //         map((results) => {
  //           const mergedTracks: SoundTrackModel[] = [];
  //
  //           console.log('results', ...results);
  //
  //           results.forEach((tracks, uuidIndex) => {
  //             tracks.forEach((track, trackIndex) => {
  //               track.part = `${uuidIndex + 1}.${trackIndex + 1}`;
  //               track.url = this.solrService.getAudioTrackMp3Url(track.pid);
  //               mergedTracks.push(track);
  //             });
  //           });
  //
  //           return loadMusicSuccess({ tracks: mergedTracks, metadata: null });
  //         }),
  //         catchError((error) => of(loadMusicFailure({ error })))
  //       );
  //     })
  //   )
  // );


  loadMusic$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMusic),
      withLatestFrom(this.store.select(selectDocumentDetail)),
      mergeMap(([{ uuids }, metadata]) => {
        const requests = uuids.map((uuid: string) =>
          this.solrService.getChildrenByModel(uuid, 'rels_ext_index.sort asc', 'track')
        );

        return forkJoin(requests).pipe(
          map(results => {
            const mergedTracks: SoundTrackModel[] = [];

            results.forEach((tracks, uuidIndex) => {
              tracks.forEach((track, trackIndex) => {
                track.part = `${uuidIndex + 1}.${trackIndex + 1}`;
                track.url = this.solrService.getAudioTrackMp3Url(track.pid);
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
