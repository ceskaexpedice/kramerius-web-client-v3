import { createReducer, on } from '@ngrx/store';
import * as PeriodicalsActions from './periodicals.actions';

export interface PeriodicalsState {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: PeriodicalsState = {
  loading: false,
  data: [],
  error: null
};

export const periodicalsReducer = createReducer(
  initialState,
  on(PeriodicalsActions.loadPeriodicals, state => ({ ...state, loading: true })),
  on(PeriodicalsActions.loadPeriodicalsSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(PeriodicalsActions.loadPeriodicalsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
