import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as GenresActions from './genres.actions';
import { SolrService } from '../../../../core/solr/solr.service';
import { FacetItem } from '../../../models/facet-item';
import { SolrResponseParser } from '../../../../core/solr/solr-response-parser';

@Injectable()
export class GenresEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadGenres$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GenresActions.loadGenres),
      switchMap(() =>
        this.solr.getGenres().pipe(
          map(data => GenresActions.loadGenresSuccess({ data })),
          catchError(error => of(GenresActions.loadGenresFailure({ error })))
        )
      )
    )
  );
}
