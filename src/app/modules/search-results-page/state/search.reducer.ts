import { createReducer, on } from '@ngrx/store';
import { FacetItem } from '../../models/facet-item';
import * as SearchActions from './search.actions';
import { SolrOperators, SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';

export interface LastSearchPayload {
  query: string;
  filters: string[];
  filterGroups?: string[][];
  advancedQuery?: string;
  advancedQueryMainOperator?: SolrOperators;
  page: number;
  pageCount: number;
  sortBy: SolrSortFields;
  sortDirection: SolrSortDirections;
  grouped?: boolean;
}

export interface SearchState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  resultsLoading: boolean;
  facetsLoading: boolean;
  error: any;
  pageResults: any[];
  pageTotalCount: number;
  pageResultsLoading: boolean;
  pageResultsError: any;
  lastSearchPayload: LastSearchPayload | null;
  lastPageSearchPayload: LastSearchPayload | null;
}

export const initialState: SearchState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  resultsLoading: false,
  facetsLoading: false,
  error: null,
  pageResults: [],
  pageTotalCount: 0,
  pageResultsLoading: false,
  pageResultsError: null,
  lastSearchPayload: null,
  lastPageSearchPayload: null,
};

export const searchReducer = createReducer(
  initialState,

  on(SearchActions.loadSearchResults, (state, payload) => ({
    ...state,
    loading: true,
    resultsLoading: true,
    facetsLoading: true,
    pageResultsLoading: true,
    error: null,
    lastSearchPayload: {
      query: payload.query,
      filters: payload.filters,
      filterGroups: payload.filterGroups,
      advancedQuery: payload.advancedQuery,
      advancedQueryMainOperator: payload.advancedQueryMainOperator,
      page: payload.page,
      pageCount: payload.pageCount,
      sortBy: payload.sortBy,
      sortDirection: payload.sortDirection,
      grouped: payload.grouped,
    },
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

  on(SearchActions.loadPageSearchResults, (state, payload) => ({
    ...state,
    pageResultsLoading: true,
    pageResultsError: null,
    lastPageSearchPayload: {
      query: payload.query,
      filters: payload.filters,
      filterGroups: payload.filterGroups,
      advancedQuery: payload.advancedQuery,
      advancedQueryMainOperator: payload.advancedQueryMainOperator,
      page: payload.page,
      pageCount: payload.pageCount,
      sortBy: payload.sortBy,
      sortDirection: payload.sortDirection,
      grouped: payload.grouped,
    },
  })),

  on(SearchActions.loadPageSearchResultsSuccess, (state, { results, totalCount }) => ({
    ...state,
    pageResults: results,
    pageTotalCount: totalCount,
    pageResultsLoading: false,
  })),

  on(SearchActions.loadPageSearchResultsFailure, (state, { error }) => ({
    ...state,
    pageResultsLoading: false,
    pageResultsError: error,
  })),
);
