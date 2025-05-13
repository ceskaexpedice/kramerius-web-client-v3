import { createReducer, on } from '@ngrx/store';
import * as DocumentDetailActions from './document-detail.actions';
import {DocumentDetail} from '../../../modules/models/document-detail';

export interface DocumentDetailState {
  loading: boolean;
  data: DocumentDetail | null;
  error: any;
}

export const initialState: DocumentDetailState = {
  loading: false,
  data: null,
  error: null,
};

export const documentDetailReducer = createReducer(
  initialState,
  on(DocumentDetailActions.loadDocumentDetail, state => ({ ...state, loading: true })),
  on(DocumentDetailActions.loadDocumentDetailSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(DocumentDetailActions.loadDocumentDetailFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
