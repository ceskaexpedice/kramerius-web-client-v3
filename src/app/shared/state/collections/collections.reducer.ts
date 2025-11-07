import { createReducer, on } from '@ngrx/store';
import { FacetItem } from '../../../modules/models/facet-item';
import * as CollectionsActions from './collections.actions';

export interface CollectionsState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  error: any;
}

export const initialState: CollectionsState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  error: null,
};

export const collectionsReducer = createReducer(
  initialState,

  on(CollectionsActions.loadCollectionSearchResults, state => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(CollectionsActions.loadCollectionSearchResultsSuccess, (state, { results, totalCount }) => ({
    ...state,
    results,
    totalCount,
    loading: false,
  })),

  on(CollectionsActions.loadCollectionFacetsSuccess, (state, { facets }) => ({
    ...state,
    facets
  })),

  on(CollectionsActions.loadCollectionSearchResultsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),

  on(CollectionsActions.loadCollectionFacetSuccess, (state, { facet, items }) => ({
    ...state,
    facets: {
      ...state.facets,
      [facet]: items,
    },
  })),

  on(CollectionsActions.clearCollectionSearch, () => ({
    ...initialState
  }))
);
