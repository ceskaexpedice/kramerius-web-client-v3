import { createReducer, on } from '@ngrx/store';
import {
  loadFacetsSuccess,
  loadFacetSuccess,
  loadPeriodicalSearchFailure,
  loadPeriodicalSearchResults,
  loadPeriodicalSearchSuccess,
} from './periodical-search.actions';
import { loadPeriodical } from '../periodical-detail/periodical-detail.actions';
import { FacetItem } from '../../../models/facet-item';

export interface PeriodicalSearchState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  facetsLoading: boolean;
  error: any;
}

export const initialState: PeriodicalSearchState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  facetsLoading: false,
  error: null,
};

export const periodicalSearchReducer = createReducer(
  initialState,

  on(loadPeriodicalSearchResults, ((state) => ({
    ...state,
    loading: true,
    facetsLoading: true
  }))),

  on(loadPeriodical, ((state) => ({
    ...state,
    facetsLoading: true
  }))),

  on(loadPeriodicalSearchSuccess, (state, { results, totalCount }) => ({
    ...state,
    results,
    totalCount,
    loading: false
  })),

  on(loadPeriodicalSearchFailure, (state, { error }) => ({ ...state, loading: false, error })),

  on(loadFacetsSuccess, (state, { facets }) => ({
    ...state,
    facets,
    facetsLoading: false,
  })),

  on(loadFacetSuccess, (state, { facet, items }) => ({
    ...state,
    facets: {
      ...state.facets,
      [facet]: items,
    },
  }))
);
