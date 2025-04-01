import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap} from 'rxjs/operators';
import { of } from 'rxjs';
import {SolrService} from '../../../core/solr/solr.service';
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
