import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {of} from 'rxjs';
import * as GenresActions from './genres.actions';
import {SolrService} from '../../../shared/services/solr.service';
import {PeriodicalItem} from '../../../modules/models/periodical-item';
import {GenreItem} from '../../../modules/models/genre-item';

@Injectable()
export class GenresEffects {
  constructor(private actions$: Actions, private solr: SolrService) {
  }

  loadGenres$ = createEffect(() =>
    this.actions$.pipe(
      ofType(GenresActions.loadGenres),
      switchMap(() =>
        this.solr.getGenres().pipe(
          map(response => {
            const raw = response?.facet_counts?.facet_fields?.['genres.facet'] || [];
            const genres: GenreItem[] = [];

            for (let i = 0; i < raw.length; i += 2) {
              genres.push({
                name: raw[i],
                count: raw[i + 1]
              });
            }

            return GenresActions.loadGenresSuccess({ data: genres });
          }),
          catchError(error => of(GenresActions.loadGenresFailure({ error })))
        )
      )
    )
  );

}
