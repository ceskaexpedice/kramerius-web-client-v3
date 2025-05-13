import { createFeatureSelector, createSelector } from '@ngrx/store';
import { DocumentTypesState } from './document-types.reducer';

export const selectDocumentTypesState = createFeatureSelector<DocumentTypesState>('document-types');

export const selectDocumentTypes = createSelector(selectDocumentTypesState, state => state.data);
export const selectDocumentTypesLoading = createSelector(selectDocumentTypesState, state => state.loading);
export const selectDocumentTypesError = createSelector(selectDocumentTypesState, state => state.error);
