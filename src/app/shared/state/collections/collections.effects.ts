import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { SolrService } from '../../../core/solr/solr.service';
import { loadCollections, loadCollectionsFailure, loadCollectionsSuccess } from './collections.actions';
import { parseSearchDocument } from '../../../modules/models/search-document';

@Injectable()
export class CollectionsEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadCollections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollections),
      switchMap(() =>
        this.solr.getCollections().pipe(
          map(collections => loadCollectionsSuccess({ data: collections.map(doc => parseSearchDocument(doc)) })),
          catchError(error => {
            console.error('Error loading collections:', error);
            return of(loadCollectionsFailure({ error }));
          })
        )
      )
    )
  );
}