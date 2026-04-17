import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, tap, withLatestFrom, distinctUntilChanged, filter, take } from 'rxjs/operators';
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
import { selectRouterUrl, selectRouterQueryParams } from '../router/router.selectors';
import { pickCdkCollection } from '../../utils/cdk-collection';

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
          filter(storeUuid => !!storeUuid),
          take(1),
          switchMap(storeUuid => this.loadDetail(storeUuid))
        );
      })
    )
  });

  private loadDetail(uuid: string) {
    // Fetch detail first so we know `cdk.leader` — on CDK, pages must be scoped to a
    // member library (`AND cdk.collection:<code>`), otherwise the aggregator returns
    // pages from every source that digitised the item. `?source=` in the URL wins
    // over `cdk.leader` so shared links restore the same source for the receiver.
    return this.solr.getDetailItem(uuid).pipe(
      withLatestFrom(this.store.select(selectRouterQueryParams)),
      switchMap(([detailItem, queryParams]) => {
        const collections: string[] = detailItem?.['cdk.collection'] ?? [];
        const cdkCollection = pickCdkCollection(
          queryParams?.['source'],
          detailItem?.['cdk.leader'],
          collections,
        );
        return forkJoin({
          detailItem: of(detailItem),
          children: this.solr.getChildrenByModel(uuid, 'rels_ext_index.sort asc', null, false, [], [], {}, undefined, cdkCollection),
        });
      }),
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

  reloadPagesForCdkCollection$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(DocumentDetailActions.reloadPagesForCdkCollection),
      switchMap(({ uuid, cdkCollection }) =>
        this.solr.getChildrenByModel(uuid, 'rels_ext_index.sort asc', null, false, [], [], {}, undefined, cdkCollection).pipe(
          map(pages => DocumentDetailActions.reloadPagesForCdkCollectionSuccess({ pages })),
          catchError(error => {
            console.log('Error reloading pages for CDK collection:', error);
            return of(DocumentDetailActions.reloadPagesForCdkCollectionSuccess({ pages: [] }));
          })
        )
      )
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
