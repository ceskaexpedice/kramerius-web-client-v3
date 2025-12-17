import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { AdminLicensesService } from '../../../core/admin/admin-licenses.service';
import {
  loadLicenses,
  loadLicensesFailure,
  loadLicensesSuccess,
  searchLicenses,
  loadMoreLicenses,
  License
} from './licenses.actions';
import {
  selectLicensesQuery,
  selectLicensesCurrentPage,
  selectLicensesPageSize
} from './licenses.selectors';

@Injectable()
export class LicensesEffects {
  constructor(
    private actions$: Actions,
    private adminLicensesService: AdminLicensesService,
    private store: Store
  ) {}

  loadLicenses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadLicenses),
      switchMap(({ query, page = 0, pageSize = 10000, reset }) =>
        this.adminLicensesService.getLicenses(query, page, pageSize).pipe(
          map(response => {
            const licenses = (response.response?.docs ?? []) as License[];
            const totalCount = response.response?.numFound ?? 0;
            const hasMore = false;

            return loadLicensesSuccess({
              data: licenses,
              totalCount,
              page,
              hasMore
            });
          }),
          catchError(error => {
            console.error('Error loading licenses:', error);
            return of(loadLicensesFailure({ error }));
          })
        )
      )
    )
  );

  searchLicenses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchLicenses),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query),
      map(({ query }) => loadLicenses({ query, page: 0, reset: true }))
    )
  );

  loadMoreLicenses$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMoreLicenses),
      withLatestFrom(
        this.store.select(selectLicensesQuery),
        this.store.select(selectLicensesCurrentPage),
        this.store.select(selectLicensesPageSize)
      ),
      map(([action, query, currentPage, pageSize]) =>
        loadLicenses({ query, page: currentPage + 1, pageSize })
      )
    )
  );
}