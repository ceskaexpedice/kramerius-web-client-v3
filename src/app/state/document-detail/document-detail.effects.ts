import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import { of } from 'rxjs';
import * as DocumentDetailActions from './document-detail.actions';
import {SolrService} from '../../core/solr/solr.service';
import {Store} from '@ngrx/store';
import * as DocumentDetailSelectors from './document-detail.selectors';
import {parseDocumentDetail} from '../../modules/models/document-detail';

@Injectable()
export class DocumentDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store
  ) {}

  loadDocumentDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DocumentDetailActions.loadDocumentDetail),
      withLatestFrom(this.store.select(DocumentDetailSelectors.selectDocumentDetailUuid)),
      switchMap(([_, pid]) =>
        this.solr.getDetailItem(pid).pipe(
          map(response => {
            console.log('response', response);
            const doc = parseDocumentDetail(response);
            if (!doc) throw new Error('Document not found');
            return DocumentDetailActions.loadDocumentDetailSuccess({ data: doc });
          }),
          catchError(error =>
            of(DocumentDetailActions.loadDocumentDetailFailure({ error }))
          )
        )
      )
    )
  );
}
