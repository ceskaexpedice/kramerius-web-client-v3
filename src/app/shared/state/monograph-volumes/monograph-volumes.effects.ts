import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import * as MonographVolumesActions from './monograph-volumes.actions';
import { SolrService } from '../../../core/solr/solr.service';
import { Store } from '@ngrx/store';
import { fromSolrToMetadata } from '../../models/metadata.model';
import * as MonographVolumesSelectors from './monograph-volumes.selectors';

@Injectable()
export class MonographVolumesEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
  ) {}

  loadMonographVolumes$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MonographVolumesActions.loadMonographVolumes),
      switchMap(({ uuid }) => {
        if (uuid) {
          return this.loadVolumes(uuid);
        }

        return this.store.select(MonographVolumesSelectors.selectMonographVolumesUuid).pipe(
          switchMap(storeUuid => this.loadVolumes(storeUuid))
        );
      })
    );
  });

  private loadVolumes(uuid: string) {
    return forkJoin({
      parent: this.solr.getDetailItem(uuid),
      volumes: this.solr.getChildrenByModel(uuid, 'rels_ext_index.sort asc', null),
    }).pipe(
      map(({ parent, volumes }) => {
        console.log('Loaded monograph volumes:', { parent, volumes });
        return MonographVolumesActions.loadMonographVolumesSuccess({
          parent: fromSolrToMetadata(parent),
          volumes,
        });
      }),
      catchError(error => {
        console.log('Error loading monograph volumes:', error);
        return of(MonographVolumesActions.loadMonographVolumesFailure({ error }));
      })
    );
  }
}
