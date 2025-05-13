import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap } from 'rxjs/operators';
import { of } from 'rxjs';
import * as DocumentTypesActions from './document-types.actions';
import {SolrService} from '../../../../core/solr/solr.service';

@Injectable()
export class DocumentTypesEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadDocumentType$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DocumentTypesActions.loadDocumentTypes),
      switchMap(() =>
        this.solr.getDocumentTypes().pipe(
          map(data => DocumentTypesActions.loadDocumentTypesSuccess({ data })),
          catchError(error => of(DocumentTypesActions.loadDocumentTypesFailure({ error })))
        )
      )
    )
  );
}
