import {createReducer, on} from '@ngrx/store';
import {FacetItem} from '../../modules/models/facet-item';
import * as SearchActions from './search.actions';
import {SolrResponseParser} from '../../core/solr/solr-response-parser';

export interface SearchResultState {
  results: any[];
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  error: any;
}

export const initialState: SearchResultState = {
  results: [],
  facets: {},
  loading: false,
  error: null,
};

export const searchResultsReducer = createReducer(
  initialState,

  on(SearchActions.loadSearchResults, state => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(SearchActions.loadSearchResultsSuccess, (state, {results}) => ({
    ...state,
    results,
  })),

  on(SearchActions.loadFacetsSuccess, (state, {facets}) => ({
    ...state,
    facets,
    loading: false,
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
