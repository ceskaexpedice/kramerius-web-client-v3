import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {combineLatest, of} from 'rxjs';
import * as PeriodicalDetailActions from './periodical-detail.actions';
import {selectPeriodicalUuid} from './periodical-detail.selectors';
import {
  loadPeriodical,
  loadPeriodicalFailure, loadPeriodicalSuccess,
  loadPeriodicalYears, loadPeriodicalYearsFailure,
  loadPeriodicalYearsSuccess,
} from './periodical-detail.actions';
import {SolrService} from '../../core/solr/solr.service';
import {Store} from '@ngrx/store';

@Injectable()
export class PeriodicalDetailEffects {
  constructor(
    private actions$: Actions,
    private store: Store,
    private solr: SolrService
  ) {}

  loadPeriodical$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodical),
      withLatestFrom(this.store.select(selectPeriodicalUuid)),
      switchMap(([_, pid]) =>
        combineLatest([
          this.solr.getDetailItem(pid),
          this.solr.getPeriodicalVolumes(pid)
        ]).pipe(
          map(([document, volumes]) => {
            const start = document['date_range_start.year'];
            const end = document['date_range_end.year'];

            if (typeof start !== 'number' || typeof end !== 'number') {
              throw new Error('Invalid year range in document');
            }

            console.log('volumes', volumes);

            const availableYears = volumes
              .map((vol: any) => ({
                year: vol['date.str'],
                pid: vol['pid']
              }))
              .filter((v): v is { year: string; pid: string } => !!v.year && !!v.pid);

            const existingYearSet = new Set(availableYears.map(v => v.year));
            const years = [];
            for (let y = start; y <= end; y++) {
              const yearStr = y.toString();
              years.push({
                year: yearStr,
                exists: existingYearSet.has(yearStr)
              });
            }

            return loadPeriodicalSuccess({
              document,
              years,
              availableYears
            });
          }),
          catchError(error => of(loadPeriodicalFailure({ error })))
        )
      )
    )
  );

  // loadPeriodicalAndYears$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(loadPeriodical),
  //     withLatestFrom(this.store.select(selectPeriodicalUuid)),
  //     switchMap(([_, pid]) =>
  //       this.solr.getDetailItem(pid).pipe(
  //         switchMap(document => {
  //           const start = document['date_range_start.year'];
  //           const end = document['date_range_end.year'];
  //
  //           if (typeof start !== 'number' || typeof end !== 'number') {
  //             throw new Error('Invalid year range in document');
  //           }
  //
  //           const allYears: string[] = [];
  //           for (let y = start; y <= end; y++) {
  //             allYears.push(y.toString());
  //           }
  //
  //           return this.solr.getChildrenByModel(pid, 'periodicalvolume').pipe(
  //             map(volumes => {
  //               const availableYears = volumes
  //                 .map(v => v['date.str'])
  //                 .filter((y: any): y is string => !!y);
  //               return loadPeriodicalSuccess({ document, years: allYears, availableYears });
  //             })
  //           );
  //         }),
  //         catchError(error => of(loadPeriodicalFailure({ error })))
  //       )
  //     )
  //   )
  // );
  //
  // loadYears$ = createEffect(() =>
  //   this.actions$.pipe(
  //     ofType(loadPeriodicalYears),
  //     withLatestFrom(this.store.select(selectPeriodicalUuid)),
  //     switchMap(([_, pid]) =>
  //       combineLatest([
  //         this.solr.getDetailItem(pid),
  //         this.solr.getPeriodicalVolumes(pid)
  //       ]).pipe(
  //         map(([doc, volumes]) => {
  //           const start = doc['date_range_start.year'];
  //           const end = doc['date_range_end.year'];
  //
  //           if (typeof start !== 'number' || typeof end !== 'number') {
  //             throw new Error('Invalid year range in document');
  //           }
  //
  //           console.log('volumes', volumes);
  //
  //           const existingYearsSet = new Set<string>(
  //             volumes
  //               .map((vol: any) => vol['date.str'])
  //               .filter((y: string | undefined) => !!y)
  //           );
  //
  //           const years: { year: string, exists: boolean }[] = [];
  //
  //           for (let year = start; year <= end; year++) {
  //             const y = year.toString();
  //             years.push({
  //               year: y,
  //               exists: existingYearsSet.has(y)
  //             });
  //           }
  //
  //           return loadPeriodicalYearsSuccess({ years });
  //         }),
  //         catchError(error => of(loadPeriodicalYearsFailure({ error })))
  //       )
  //     )
  //   )
  // );
}
