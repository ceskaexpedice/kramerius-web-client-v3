import { createReducer, on } from '@ngrx/store';
import { SearchDocument } from '../../../modules/models/search-document';
import * as CollectionsActions from './collections.actions';

export interface CollectionsState {
  loading: boolean;
  data: SearchDocument[];
  error: any;
  query: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export const initialState: CollectionsState = {
  loading: false,
  data: [],
  error: null,
  query: '',
  currentPage: 0,
  pageSize: 10000,
  totalCount: 0,
  hasMore: false
};

export const collectionsReducer = createReducer(
  initialState,
  on(CollectionsActions.loadCollections, (state, { reset }) => ({
    ...state,
    loading: true,
    error: null,
    ...(reset && { data: [], currentPage: 0, totalCount: 0, hasMore: false })
  })),
  on(CollectionsActions.loadCollectionsSuccess, (state, { data, totalCount, page, hasMore }) => ({
    ...state,
    loading: false,
    data: page === 0 ? data : [...state.data, ...data],
    totalCount,
    currentPage: page,
    hasMore,
    error: null
  })),
  on(CollectionsActions.loadCollectionsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(CollectionsActions.searchCollections, (state, { query }) => ({
    ...state,
    query,
    data: [],
    currentPage: 0,
    totalCount: 0,
    hasMore: false,
    loading: true,
    error: null
  })),
  on(CollectionsActions.loadMoreCollections, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(CollectionsActions.clearCollectionsSearch, () => ({
    ...initialState
  }))
);
