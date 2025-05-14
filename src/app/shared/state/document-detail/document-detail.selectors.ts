import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DocumentDetailState } from './document-detail.reducer';
import {selectRouterParams} from '../router/router.selectors';

export const selectDocumentDetailState = createFeatureSelector<DocumentDetailState>('document-detail');

export const selectDocumentDetail = createSelector(selectDocumentDetailState, state => state.data);
export const selectDocumentDetailLoading = createSelector(selectDocumentDetailState, state => state.loading);
export const selectDocumentDetailError = createSelector(selectDocumentDetailState, state => state.error);

export const selectDocumentDetailUuid = createSelector(
  selectRouterParams,
  (params) => params['uuid']
);
