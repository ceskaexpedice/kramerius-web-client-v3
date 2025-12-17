import { createReducer, on } from '@ngrx/store';
import { License } from './licenses.actions';
import * as LicensesActions from './licenses.actions';

export interface LicensesState {
  loading: boolean;
  data: License[];
  error: any;
  query: string;
  currentPage: number;
  pageSize: number;
  totalCount: number;
  hasMore: boolean;
}

export const initialState: LicensesState = {
  loading: false,
  data: [],
  error: null,
  query: '',
  currentPage: 0,
  pageSize: 10000,
  totalCount: 0,
  hasMore: false
};

export const licensesReducer = createReducer(
  initialState,
  on(LicensesActions.loadLicenses, (state, { reset }) => ({
    ...state,
    loading: true,
    error: null,
    ...(reset && { data: [], currentPage: 0, totalCount: 0, hasMore: false })
  })),
  on(LicensesActions.loadLicensesSuccess, (state, { data, totalCount, page, hasMore }) => ({
    ...state,
    loading: false,
    data: page === 0 ? data : [...state.data, ...data],
    totalCount,
    currentPage: page,
    hasMore,
    error: null
  })),
  on(LicensesActions.loadLicensesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(LicensesActions.searchLicenses, (state, { query }) => ({
    ...state,
    query,
    data: [],
    currentPage: 0,
    totalCount: 0,
    hasMore: false,
    loading: true,
    error: null
  })),
  on(LicensesActions.loadMoreLicenses, (state) => ({
    ...state,
    loading: true,
    error: null
  })),
  on(LicensesActions.clearLicensesSearch, () => ({
    ...initialState
  }))
);