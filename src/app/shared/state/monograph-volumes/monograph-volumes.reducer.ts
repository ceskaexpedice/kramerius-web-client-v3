import { createReducer, on } from '@ngrx/store';
import * as MonographVolumesActions from './monograph-volumes.actions';
import { Metadata } from '../../models/metadata.model';

export interface MonographVolumesState {
  loading: boolean;
  parent: Metadata | null;
  volumes: any[];
  error: any;
}

export const initialState: MonographVolumesState = {
  loading: false,
  parent: null,
  volumes: [],
  error: null,
};

export const monographVolumesReducer = createReducer(
  initialState,
  on(MonographVolumesActions.loadMonographVolumes, state => ({
    ...state,
    loading: true,
    error: null
  })),
  on(MonographVolumesActions.loadMonographVolumesSuccess, (state, { parent, volumes }) => ({
    ...state,
    loading: false,
    parent,
    volumes: volumes || [],
    error: null
  })),
  on(MonographVolumesActions.loadMonographVolumesFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  })),
  on(MonographVolumesActions.clearMonographVolumes, () => initialState)
);
