import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';
import {
  loadPeriodical,
  loadPeriodicalFailure,
  loadPeriodicalSuccess
} from './periodical-detail.actions';
import { SolrService } from '../../../core/solr/solr.service';
import { selectAvailableYears } from './periodical-detail.selectors';
import { Store } from '@ngrx/store';
import {PeriodicalItemYear} from '../../models/periodical-item';
import {DocumentAccessibilityEnum} from '../../constants/document-accessibility';

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
                  const availableYears = this.mapAvailableYears(volumes);
                  const years = this.buildYearList(document, availableYears);
                  return loadPeriodicalSuccess({ document, years, availableYears });
                })
              );
            }

            if (document.model === 'periodicalvolume') {
              return this.solr.getPeriodicalItems(uuid).pipe(
                withLatestFrom(this.store.select(selectAvailableYears)),
                switchMap(([children, previousAvailableYears]) => {
                  if (previousAvailableYears && previousAvailableYears.length > 0) {
                    return of(loadPeriodicalSuccess({
                      document,
                      years: [],
                      availableYears: previousAvailableYears,
                      children
                    }));
                  }

                  const rootPid = document['root.pid'];
                  if (!rootPid) {
                    return of(loadPeriodicalFailure({ error: 'Missing root.pid for periodicalvolume' }));
                  }

                  return this.solr.getPeriodicalVolumes(rootPid).pipe(
                    map(volumes => {
                      const availableYears = this.mapAvailableYears(volumes);
                      return loadPeriodicalSuccess({
                        document,
                        years: [],
                        availableYears,
                        children
                      });
                    }),
                    catchError(error =>
                      of(loadPeriodicalFailure({ error: 'Failed to load parent periodical volumes: ' + error }))
                    )
                  );
                })
              );
            }

            return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
          }),
          catchError(error => of(loadPeriodicalFailure({ error })))
        )
      )
    )
  );

  private mapAvailableYears(volumes: any[]): PeriodicalItemYear[] {
    return volumes
      .filter(v => !!v['date.str'] && !!v['pid'] && !!v['accessibility'])
      .map(v => ({
        year: v['date.str'],
        pid: v['pid'],
        exists: true as const,
        accessibility: v['accessibility'] as DocumentAccessibilityEnum
      }));
  }

  private buildYearList(document: any, availableYears: PeriodicalItemYear[]): PeriodicalItemYear[] {
    const start = parseInt(document['date_range_start.year'], 10);
    const end = parseInt(document['date_range_end.year'], 10);

    return Array.from({ length: end - start + 1 }, (_, i) => {
      const year = (start + i).toString();
      const found = availableYears.find(y => y.year === year);

      return {
        year,
        pid: found?.pid ?? '',
        exists: true,
        accessibility: found?.accessibility ?? DocumentAccessibilityEnum.PRIVATE
      };
    });
  }
}
