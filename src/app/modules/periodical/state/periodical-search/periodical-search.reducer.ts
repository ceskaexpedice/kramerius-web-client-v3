import { createReducer, on } from '@ngrx/store';
import {
  loadFacetSuccess,
  loadPeriodicalSearchFailure,
  loadPeriodicalSearchResults,
  loadPeriodicalSearchSuccess,
} from './periodical-search.actions';
import {FacetItem} from '../../../models/facet-item';

export interface PeriodicalSearchState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  error: any;
}

export const initialState: PeriodicalSearchState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  error: null,
};

export const periodicalSearchReducer = createReducer(
  initialState,

  on(loadPeriodicalSearchResults, ((state) => ({
    ...state,
    loading: true
  }))),

  on(loadPeriodicalSearchSuccess, (state, {results, totalCount}) => ({
    ...state,
    results,
    totalCount,
    loading: false
  })),

  on(loadPeriodicalSearchFailure, (state, { error }) => ({ ...state, loading: false, error })),

  on(loadFacetSuccess, (state, { facet, items }) => ({
    ...state,
    facets: {
      ...state.facets,
      [facet]: items,
    },
  }))
);
