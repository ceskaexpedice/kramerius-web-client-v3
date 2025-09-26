import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../core/solr/solr.service';
import {
  loadCollections,
  loadCollectionsFailure,
  loadCollectionsSuccess,
  searchCollections,
  loadMoreCollections
} from './collections.actions';
import { parseSearchDocument } from '../../../modules/models/search-document';
import {
  selectCollectionsQuery,
  selectCollectionsCurrentPage,
  selectCollectionsPageSize
} from './collections.selectors';

@Injectable()
export class CollectionsEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store
  ) {}

  loadCollections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollections),
      switchMap(({ query, page = 0, pageSize = 10000, reset }) =>
        this.solr.getCollections(query, page, pageSize).pipe(
          map(response => {
            const collections = (response.response?.docs ?? []).map((doc: any) => parseSearchDocument(doc));
            const totalCount = response.response?.numFound ?? 0;
            // const hasMore = (page + 1) * pageSize < totalCount;
            const hasMore = false;

            return loadCollectionsSuccess({
              data: collections,
              totalCount,
              page,
              hasMore
            });
          }),
          catchError(error => {
            console.error('Error loading collections:', error);
            return of(loadCollectionsFailure({ error }));
          })
        )
      )
    )
  );

  searchCollections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(searchCollections),
      debounceTime(300),
      distinctUntilChanged((prev, curr) => prev.query === curr.query),
      map(({ query }) => loadCollections({ query, page: 0, reset: true }))
    )
  );

  loadMoreCollections$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadMoreCollections),
      withLatestFrom(
        this.store.select(selectCollectionsQuery),
        this.store.select(selectCollectionsCurrentPage),
        this.store.select(selectCollectionsPageSize)
      ),
      map(([action, query, currentPage, pageSize]) =>
        loadCollections({ query, page: currentPage + 1, pageSize })
      )
    )
  );
}
