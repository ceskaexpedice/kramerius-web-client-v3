import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import { of } from 'rxjs';
import {SolrService} from '../../../core/solr/solr.service';
import {loadPeriodicals, loadPeriodicalsFailure, loadPeriodicalsSuccess} from './periodicals.actions';

@Injectable()
export class PeriodicalsEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadPeriodicals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodicals),
      switchMap(() =>
        this.solr.getPeriodicals().pipe(
          map(periodicals => loadPeriodicalsSuccess({ data: periodicals })),
          catchError(error => {
            console.error('Chyba v efektoch:', error);
            return of(loadPeriodicalsFailure({ error }));
          })
        )
      )
    )
  );
}
