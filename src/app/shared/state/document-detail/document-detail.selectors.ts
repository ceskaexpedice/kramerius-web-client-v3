import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DocumentDetailState } from './document-detail.reducer';
import {selectRouterParams, selectRouterQueryParams} from '../router/router.selectors';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';

export const selectDocumentDetailState = createFeatureSelector<DocumentDetailState>('document-detail');

export const selectDocumentDetail = createSelector(selectDocumentDetailState, state => state?.data);
export const selectDocumentDetailPages = createSelector(selectDocumentDetailState, state => {
  return state?.pages;
});
export const selectDocumentDetailOnlyPages = createSelector(selectDocumentDetailState, state => {
  return state.pages?.filter((p: any) => p.model === DocumentTypeEnum.page);
});
export const selectDocumentDetailOnlyRecordings = createSelector(selectDocumentDetailState, state => {
  return state.pages?.filter((p: any) => p.model === DocumentTypeEnum.soundunit);
});
export const selectDocumentDetailOnlyArticles = createSelector(selectDocumentDetailState, state => {
  return state.pages?.filter((p: any) => p.model === DocumentTypeEnum.article);
});
export const selectDocumentDetailLoading = createSelector(selectDocumentDetailState, state => state?.loading);
export const selectDocumentDetailError = createSelector(selectDocumentDetailState, state => state.error);

export const selectArticleDetail = createSelector(selectDocumentDetailState, state => state?.articleDetail);
export const selectArticleDetailLoading = createSelector(selectDocumentDetailState, state => state?.articleDetailLoading);
export const selectArticleDetailError = createSelector(selectDocumentDetailState, state => state?.articleDetailError);

export const selectDocumentDetailUuid = createSelector(
  selectRouterParams,
  (params) => params['uuid']
);

export const selectArticleUuidFromQuery = createSelector(
  selectRouterQueryParams,
  (queryParams) => queryParams['article']
);
