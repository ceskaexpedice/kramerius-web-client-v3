import { createReducer, on } from '@ngrx/store';
import { FacetItem } from '../../../modules/models/facet-item';
import { Metadata } from '../../models/metadata.model';
import * as CollectionsActions from './collections.actions';

export interface CollectionsState {
  results: any[];
  totalCount: number;
  facets: { [key: string]: FacetItem[] };
  loading: boolean;
  error: any;
  detail: Metadata | null;
  detailLoading: boolean;
  detailError: any;
  // State for loading ALL collections
  allCollections: any[];
  allCollectionsTotalCount: number;
  allCollectionsLoading: boolean;
  allCollectionsError: any;
}

export const initialState: CollectionsState = {
  results: [],
  totalCount: 0,
  facets: {},
  loading: false,
  error: null,
  detail: null,
  detailLoading: false,
  detailError: null,
  allCollections: [],
  allCollectionsTotalCount: 0,
  allCollectionsLoading: false,
  allCollectionsError: null,
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

  on(CollectionsActions.loadCollectionDetail, (state) => ({
    ...state,
    detailLoading: true,
    detailError: null,
  })),

  on(CollectionsActions.loadCollectionDetailSuccess, (state, { detail }) => ({
    ...state,
    detail,
    detailLoading: false,
    detailError: null,
  })),

  on(CollectionsActions.loadCollectionDetailFailure, (state, { error }) => ({
    ...state,
    detailLoading: false,
    detailError: error,
  })),

  on(CollectionsActions.clearCollectionSearch, () => ({
    ...initialState
  })),

  // Reducers for loading ALL collections
  on(CollectionsActions.loadAllCollections, state => ({
    ...state,
    allCollectionsLoading: true,
    allCollectionsError: null,
  })),

  on(CollectionsActions.loadAllCollectionsSuccess, (state, { collections, totalCount }) => ({
    ...state,
    allCollections: collections,
    allCollectionsTotalCount: totalCount,
    allCollectionsLoading: false,
  })),

  on(CollectionsActions.loadAllCollectionsFailure, (state, { error }) => ({
    ...state,
    allCollectionsLoading: false,
    allCollectionsError: error,
  }))
);
