import { createReducer, on } from '@ngrx/store';
import * as MonographVolumesActions from './monograph-volumes.actions';
import { Metadata } from '../../models/metadata.model';

export interface MonographVolumesState {
  loading: boolean;
  parent: Metadata | null;
  volumes: any[];
  error: any;
  facets: any;
  facetsLoading: boolean;
  facetsError: any;
  // In-monograph search (term over pages + units), mirroring periodical search
  searchResults: any[];
  searchTotalCount: number;
  searchLoading: boolean;
  searchError: any;
}

export const initialState: MonographVolumesState = {
  loading: false,
  parent: null,
  volumes: [],
  error: null,
  facets: {},
  facetsLoading: false,
  facetsError: null,
  searchResults: [],
  searchTotalCount: 0,
  searchLoading: false,
  searchError: null,
};

export const monographVolumesReducer = createReducer(
  initialState,
  on(MonographVolumesActions.loadMonographVolumes, state => ({
    ...state,
    loading: true,
    facetsLoading: true,
    error: null,
    facetsError: null
  })),
  on(MonographVolumesActions.loadMonographVolumesSuccess, (state, { parent, volumes, facets }) => ({
    ...state,
    loading: false,
    facetsLoading: false,
    parent,
    volumes: volumes || [],
    facets: facets || {},
    error: null,
    facetsError: null
  })),
  on(MonographVolumesActions.loadMonographVolumesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    facetsLoading: false,
    error,
    facetsError: error
  })),
  on(MonographVolumesActions.clearMonographVolumes, () => initialState),
  on(MonographVolumesActions.loadMonographVolumesSearchResults, state => ({
    ...state,
    searchLoading: true,
    searchError: null
  })),
  on(MonographVolumesActions.loadMonographVolumesSearchSuccess, (state, { results, totalCount }) => ({
    ...state,
    searchLoading: false,
    searchResults: results || [],
    searchTotalCount: totalCount || 0,
    searchError: null
  })),
  on(MonographVolumesActions.loadMonographVolumesSearchFailure, (state, { error }) => ({
    ...state,
    searchLoading: false,
    searchError: error
  })),
  on(MonographVolumesActions.clearMonographVolumesSearch, state => ({
    ...state,
    searchResults: [],
    searchTotalCount: 0,
    searchLoading: false,
    searchError: null
  }))
);
