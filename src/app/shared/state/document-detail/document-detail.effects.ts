import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, tap, withLatestFrom} from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import * as DocumentDetailActions from './document-detail.actions';
import {SolrService} from '../../../core/solr/solr.service';
import {Store} from '@ngrx/store';
import * as DocumentDetailSelectors from './document-detail.selectors';
import {parseDocumentDetail} from '../../../modules/models/document-detail';
import {parseSearchDocument} from '../../../modules/models/search-document';
import * as SearchActions from '../../../modules/search-results-page/state/search.actions';
import {fromSolrToMetadata} from '../../models/metadata.model';
import {loadDocumentDetail} from './document-detail.actions';

@Injectable()
export class DocumentDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
  ) {
  }

//   loadDocumentDetail$ = createEffect(() =>
//     this.actions$.pipe(
//       ofType(DocumentDetailActions.loadDocumentDetail),
//       withLatestFrom(this.store.select(DocumentDetailSelectors.selectDocumentDetailUuid)),
//       switchMap(([_, pid]) => {
//           return forkJoin(
//             {
//               detailItem: this.solr.getDetailItem(pid),
//               children: this.solr.getChildrenByModel(pid, 'page', 'rels_ext_index.sort asc'),
//             },
//           ).pipe(
//             switchMap(({detailItem, children}) => {
// console.log('detail item', detailItem);
//               return [
//                 DocumentDetailActions.loadDocumentDetailSuccess({
//                   data: fromSolrToMetadata(detailItem),
//                   pages: children,
//                 }),
//               ];
//             }),
//             catchError(error => of(DocumentDetailActions.loadDocumentDetailFailure({error}))),
//           );
//         },
//       ),
//     ),
//   );

  loadDocumentDetail$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(DocumentDetailActions.loadDocumentDetail),
      tap(action => console.log('➡️ loadDocumentDetail action received:', action)), // ADD THIS
      switchMap(({ uuid }) => {
        console.log('ide sem??')
        if (uuid) {
          return this.loadDetail(uuid);
        }

        return this.store.select(DocumentDetailSelectors.selectDocumentDetailUuid).pipe(
          switchMap(storeUuid => this.loadDetail(storeUuid))
        );
      })
    )
  }
  );

  private loadDetail(uuid: string) {
    return forkJoin({
      detailItem: this.solr.getDetailItem(uuid),
      children: this.solr.getChildrenByModel(uuid, 'page', 'rels_ext_index.sort asc'),
    }).pipe(
      map(({ detailItem, children }) => {
        return DocumentDetailActions.loadDocumentDetailSuccess({
          data: fromSolrToMetadata(detailItem),
          pages: children,
        });
      }),
      catchError(error =>
        of(DocumentDetailActions.loadDocumentDetailFailure({ error }))
      )
    );
  }


}
