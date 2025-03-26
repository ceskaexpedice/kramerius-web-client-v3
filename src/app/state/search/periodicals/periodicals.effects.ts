import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as PeriodicalsActions from './periodicals.actions';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import { of } from 'rxjs';
import {SolrService} from '../../../shared/services/solr.service';
import {loadPeriodicals, loadPeriodicalsFailure, loadPeriodicalsSuccess} from './periodicals.actions';
import {PeriodicalItem} from '../../../modules/models/periodical-item';

@Injectable()
export class PeriodicalsEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadPeriodicals$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodicals),
      switchMap(() =>
        this.solr.getPeriodicals().pipe(
          map(result => {
            const docs = result.response?.docs ?? [];
            return docs.map((doc: any) => ({
              uuid: doc.pid,
              title: doc['root.title'] || '—',
              dateRange: doc['date.str'] || '',
              accessibility: doc.accessibility || '',
              licenses: doc['licenses.facet'] ?? [],
            } as PeriodicalItem));
          }),
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
