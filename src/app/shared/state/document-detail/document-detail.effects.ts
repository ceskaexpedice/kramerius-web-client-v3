import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import * as DocumentDetailActions from './document-detail.actions';
import {SolrService} from '../../../core/solr/solr.service';
import {Store} from '@ngrx/store';
import * as DocumentDetailSelectors from './document-detail.selectors';
import {parseDocumentDetail} from '../../../modules/models/document-detail';
import {parseSearchDocument} from '../../../modules/models/search-document';
import * as SearchActions from '../../../modules/search-results-page/state/search.actions';

@Injectable()
export class DocumentDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
  ) {
  }

  loadDocumentDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(DocumentDetailActions.loadDocumentDetail),
      withLatestFrom(this.store.select(DocumentDetailSelectors.selectDocumentDetailUuid)),
      switchMap(([_, pid]) => {
          return forkJoin(
            {
              detailItem: this.solr.getDetailItem(pid),
              children: this.solr.getChildrenByModel(pid, 'page'),
            },
          ).pipe(
            switchMap(({detailItem, children}) => {

              return [
                DocumentDetailActions.loadDocumentDetailSuccess({
                  data: parseDocumentDetail(detailItem),
                  pages: children,
                }),
              ];
            }),
            catchError(error => of(DocumentDetailActions.loadDocumentDetailFailure({error}))),
          );
        },
      ),
    ),
  );
}
