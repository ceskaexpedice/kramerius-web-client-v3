import { createReducer, on } from '@ngrx/store';
import * as DocumentTypesActions from './document-types.actions';

export interface DocumentTypesState {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: DocumentTypesState = {
  loading: false,
  data: [],
  error: null,
};

export const documentTypesReducer = createReducer(
  initialState,
  on(DocumentTypesActions.loadDocumentTypes, state => ({ ...state, loading: true })),
  on(DocumentTypesActions.loadDocumentTypesSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(DocumentTypesActions.loadDocumentTypesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
