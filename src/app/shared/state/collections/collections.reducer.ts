import { createReducer, on } from '@ngrx/store';
import * as CollectionsActions from './collections.actions';

export interface CollectionsState {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: CollectionsState = {
  loading: false,
  data: [],
  error: null
};

export const collectionsReducer = createReducer(
  initialState,
  on(CollectionsActions.loadCollections, state => ({ ...state, loading: true })),
  on(CollectionsActions.loadCollectionsSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(CollectionsActions.loadCollectionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);