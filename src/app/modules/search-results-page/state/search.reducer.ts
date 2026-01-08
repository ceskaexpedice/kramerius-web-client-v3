import { createReducer, on } from '@ngrx/store';
import { FacetItem } from '../../models/facet-item';
import * as SearchActions from './search.actions';

export interface SearchState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  resultsLoading: boolean;
  facetsLoading: boolean;
  error: any;
}

export const initialState: SearchState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  resultsLoading: false,
  facetsLoading: false,
  error: null,
};

export const searchReducer = createReducer(
  initialState,

  on(SearchActions.loadSearchResults, state => ({
    ...state,
    loading: true,
    resultsLoading: true,
    facetsLoading: true,
    error: null,
  })),

  on(SearchActions.loadSearchResultsSuccess, (state, { results, totalCount }) => ({
    ...state,
    results,
    totalCount,
    loading: false,
    resultsLoading: false,
  })),

  on(SearchActions.loadFacetsSuccess, (state, { facets }) => ({
    ...state,
    facets,
    facetsLoading: false
  })),

  on(SearchActions.loadSearchResultsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    resultsLoading: false,
    facetsLoading: false,
    error,
  })),

  on(SearchActions.loadFacetsFailure, (state, { error }) => ({
    ...state,
    facetsLoading: false
  })),

  on(SearchActions.loadFacetSuccess, (state, { facet, items }) => ({
    ...state,
    facets: {
      ...state.facets,
      [facet]: items,
    },
  })),
);
