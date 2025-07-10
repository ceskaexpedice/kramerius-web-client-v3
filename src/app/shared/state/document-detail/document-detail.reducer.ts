import { createReducer, on } from '@ngrx/store';
import * as DocumentDetailActions from './document-detail.actions';
import {Page} from '../../models/page.model';
import {Metadata} from '../../models/metadata.model';

export interface DocumentDetailState {
  loading: boolean;
  data: Metadata | null;
  pages: Page[] | null;
  error: any;
}

export const initialState: DocumentDetailState = {
  loading: false,
  data: null,
  pages: null,
  error: null,
};

export const documentDetailReducer = createReducer(
  initialState,
  on(DocumentDetailActions.loadDocumentDetail, state => ({ ...state, loading: true })),
  on(DocumentDetailActions.loadDocumentDetailSuccess, (state, { data, pages }) => ({
    ...state,
    loading: false,
    data,
    pages: pages || [],
  })),
  on(DocumentDetailActions.loadDocumentDetailFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
