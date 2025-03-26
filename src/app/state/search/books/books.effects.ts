import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap} from 'rxjs/operators';
import { of } from 'rxjs';
import {SolrService} from '../../../shared/services/solr.service';
import {
  loadBooks,
  loadBooksFailure, loadBooksSuccess,
} from './books.actions';

@Injectable()
export class BooksEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadBooks = createEffect(() =>
    this.actions$.pipe(
      ofType(loadBooks),
      switchMap(() =>
        this.solr.getBooks().pipe(
          map(result => {
            const docs = result.response?.docs ?? [];
            return docs.map((doc: any) => ({
              uuid: doc.pid,
              title: doc['root.title'] || '—',
              dateRange: doc['date.str'] || '',
              accessibility: doc.accessibility || '',
              licenses: doc['licenses.facet'] ?? [],
            } as any));
          }),
          map(books => loadBooksSuccess({ data: books })),
          catchError(error => {
            console.error('Chyba v efektoch:', error);
            return of(loadBooksFailure({ error }));
          })
        )
      )
    )
  );
}
