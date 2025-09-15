import {createReducer, on} from '@ngrx/store';
import {FacetItem} from '../../models/facet-item';
import * as SearchActions from './search.actions';
import {SolrResponseParser} from '../../../core/solr/solr-response-parser';

export interface SearchState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  error: any;
}

export const initialState: SearchState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  error: null,
};

export const searchReducer = createReducer(
  initialState,

  on(SearchActions.loadSearchResults, state => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(SearchActions.loadSearchResultsSuccess, (state, {results, totalCount}) => ({
    ...state,
    results,
    totalCount,
    loading: false,
  })),

  on(SearchActions.loadFacetsSuccess, (state, {facets}) => ({
    ...state,
    facets
  })),

  on(SearchActions.loadSearchResultsFailure, (state, {error}) => ({
    ...state,
    loading: false,
    error,
  })),

  on(SearchActions.loadFacetSuccess, (state, {facet, items}) => ({
    ...state,
    facets: {
      ...state.facets,
      [facet]: items,
    },
  })),
);
