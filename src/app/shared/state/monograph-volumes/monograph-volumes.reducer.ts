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
}

export const initialState: MonographVolumesState = {
  loading: false,
  parent: null,
  volumes: [],
  error: null,
  facets: {},
  facetsLoading: false,
  facetsError: null,
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
  on(MonographVolumesActions.clearMonographVolumes, () => initialState)
);
