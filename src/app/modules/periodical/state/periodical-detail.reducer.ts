import { createReducer, on } from '@ngrx/store';
import {
  loadPeriodical, loadPeriodicalFailure,
  loadPeriodicalSuccess
} from './periodical-detail.actions';
import {PeriodicalItem, PeriodicalItemChild, PeriodicalItemYear} from '../../models/periodical-item';

export interface PeriodicalDetailState {
  document: PeriodicalItem | null;
  years: PeriodicalItemYear[];
  availableYears: PeriodicalItemYear[];
  children: PeriodicalItemChild[];
  loading: boolean;
  error: any;
}

export const initialState: PeriodicalDetailState = {
  document: null,
  years: [],
  availableYears: [],
  children: [],
  loading: false,
  error: null
};

export const periodicalDetailReducer = createReducer(
  initialState,
  on(loadPeriodical, state => ({ ...state, loading: true })),
  on(loadPeriodicalSuccess, (state, { document, years, availableYears, children }) => ({
    ...state,
    loading: false,
    document,
    years,
    availableYears,
    children: children || []
  })),
  on(loadPeriodicalFailure, (state, { error }) => ({ ...state, loading: false, error }))
);
