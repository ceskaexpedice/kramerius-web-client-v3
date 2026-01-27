import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap, withLatestFrom, distinctUntilChanged, filter } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import * as DocumentDetailActions from './document-detail.actions';
import { SolrService } from '../../../core/solr/solr.service';
import { Store } from '@ngrx/store';
import * as DocumentDetailSelectors from './document-detail.selectors';
import { fromSolrToMetadata } from '../../models/metadata.model';
import { Router } from '@angular/router';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { APP_ROUTES_ENUM } from "../../../app.routes";
import { ROUTER_NAVIGATED } from '@ngrx/router-store';
import { selectRouterUrl } from '../router/router.selectors';

@Injectable()
export class DocumentDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private router: Router,
  ) {
  }

  loadDocumentDetail$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(DocumentDetailActions.loadDocumentDetail),
      switchMap(({ uuid }) => {
        if (uuid) {
          return this.loadDetail(uuid);
        }

        return this.store.select(DocumentDetailSelectors.selectDocumentDetailUuid).pipe(
          switchMap(storeUuid => this.loadDetail(storeUuid))
        );
      })
    )
  });

  private loadDetail(uuid: string) {
    return forkJoin({
      detailItem: this.solr.getDetailItem(uuid),
      children: this.solr.getChildrenByModel(uuid, 'rels_ext_index.sort asc', null),
    }).pipe(
      tap(({ detailItem, children }) => {
        const isMonograph = detailItem?.model === DocumentTypeEnum.monograph;
        const hasMonographUnits = children?.some((child: any) => child.model === DocumentTypeEnum.monographunit);

        const isConvolute = detailItem?.model === DocumentTypeEnum.convolute;

        if ((isMonograph && hasMonographUnits) || isConvolute) {
          console.log('Detected multi-volume monograph, redirecting to /monograph/' + uuid);
          this.router.navigate([APP_ROUTES_ENUM.MONOGRAPH_VIEW, uuid], { replaceUrl: true });
        }
      }),
      switchMap(({ detailItem, children }) => {
        console.log('detailItem', detailItem);
        console.log('children', children);
        if (!detailItem) {
          throw new Error('Document detail item is null');
        }

        // Check if children contain any articles
        const hasArticles = children?.some((child: any) => child.model === DocumentTypeEnum.article);

        const successAction = DocumentDetailActions.loadDocumentDetailSuccess({
          data: fromSolrToMetadata(detailItem),
          pages: children,
        });

        // If no articles, also dispatch clearArticleDetail
        if (!hasArticles) {
          return of(successAction, DocumentDetailActions.clearArticleDetail());
        }

        return of(successAction);
      }),
      catchError(error => {
        console.log('Error loading document detail:', error);
        return of(DocumentDetailActions.loadDocumentDetailFailure({ error }));
      })
    );
  }

  // Effect to watch for article UUID changes in query params and load article detail
  loadArticleDetailOnQueryParamChange$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(ROUTER_NAVIGATED),
      withLatestFrom(
        this.store.select(DocumentDetailSelectors.selectArticleUuidFromQuery),
        this.store.select(selectRouterUrl)
      ),
      filter(([_, __, url]) =>
        url?.includes(`/${APP_ROUTES_ENUM.DETAIL_VIEW}`) ||
        url?.includes(`/${APP_ROUTES_ENUM.MUSIC_VIEW}`)
      ),
      map(([_, articleUuid]) => articleUuid),
      distinctUntilChanged(),
      filter(articleUuid => !!articleUuid),
      map(articleUuid => DocumentDetailActions.loadArticleDetail({ articleUuid: articleUuid! }))
    );
  });

  loadArticleDetail$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(DocumentDetailActions.loadArticleDetail),
      switchMap(({ articleUuid }) => {
        return this.solr.getDetailItem(articleUuid).pipe(
          map(articleDetail => {
            return DocumentDetailActions.loadArticleDetailSuccess({ articleDetail });
          }),
          catchError(error => {
            console.log('Error loading article detail:', error);
            return of(DocumentDetailActions.loadArticleDetailFailure({ error }));
          })
        );
      })
    );
  });
}
