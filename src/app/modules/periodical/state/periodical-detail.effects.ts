import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {of} from 'rxjs';
import {
  loadPeriodical,
  loadPeriodicalFailure, loadPeriodicalSuccess
} from './periodical-detail.actions';
import {SolrService} from '../../../core/solr/solr.service';
import {selectAvailableYears} from './periodical-detail.selectors';
import {Store} from '@ngrx/store';

@Injectable()
export class PeriodicalDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store
  ) {}

  loadPeriodical$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodical),
      switchMap(({ uuid }) =>
        this.solr.getDetailItem(uuid).pipe(
          switchMap(document => {
            if (document.model === 'periodical') {
              return this.solr.getPeriodicalVolumes(uuid).pipe(
                map(volumes => {
                  const availableYears = volumes
                    .map(v => ({ year: v['date.str'], pid: v['pid'], exists: true, accessibility: v['accessibility'] }))
                    .filter(v => v.year && v.pid);

                  const start = parseInt(document['date_range_start.year'], 10);
                  const end = parseInt(document['date_range_end.year'], 10);
                  const yearList = Array.from({ length: end - start + 1 }, (_, i) => ({
                    year: (start + i).toString(),
                    exists: availableYears.some(v => v.year === (start + i).toString()),
                    pid: availableYears.find(v => v.year === (start + i).toString())?.pid || null,
                    accessibility: availableYears.find(v => v.year === (start + i).toString())?.accessibility || null
                  }));

                  return loadPeriodicalSuccess({ document, years: yearList, availableYears });
                })
              );
            }

            if (document.model === 'periodicalvolume') {
              return this.solr.getPeriodicalItems(uuid).pipe(
                withLatestFrom(this.store.select(selectAvailableYears)),
                map(([children, previousAvailableYears]) =>
                  loadPeriodicalSuccess({
                    document,
                    years: [],
                    availableYears: previousAvailableYears || [],
                    children
                  })
                )
              );
            }

            return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
          }),
          catchError(error => of(loadPeriodicalFailure({ error })))
        )
      )
    )
  );
}
