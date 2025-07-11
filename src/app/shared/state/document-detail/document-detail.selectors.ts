import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DocumentDetailState } from './document-detail.reducer';
import {selectRouterParams} from '../router/router.selectors';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';
import {Page} from '../../models/page.model';

export const selectDocumentDetailState = createFeatureSelector<DocumentDetailState>('document-detail');

export const selectDocumentDetail = createSelector(selectDocumentDetailState, state => state.data);
export const selectDocumentDetailPages = createSelector(selectDocumentDetailState, state => {
  return state.pages;
});
export const selectDocumentDetailOnlyPages = createSelector(selectDocumentDetailState, state => {
  return state.pages?.filter((p: any) => p.model === DocumentTypeEnum.page);
});
export const selectDocumentDetailOnlyRecordings = createSelector(selectDocumentDetailState, state => {
  return state.pages?.filter((p: any) => p.model === DocumentTypeEnum.soundunit);
});
export const selectDocumentDetailLoading = createSelector(selectDocumentDetailState, state => state.loading);
export const selectDocumentDetailError = createSelector(selectDocumentDetailState, state => state.error);

export const selectDocumentDetailUuid = createSelector(
  selectRouterParams,
  (params) => params['uuid']
);
