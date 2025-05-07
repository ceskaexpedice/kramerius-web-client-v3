import { createReducer, on } from '@ngrx/store';
import * as PeriodicalDetailActions from './periodical-detail.actions';
import {
  loadPeriodical, loadPeriodicalFailure,
  loadPeriodicalSuccess,
  loadPeriodicalYears,
  loadPeriodicalYearsFailure,
  loadPeriodicalYearsSuccess,
} from './periodical-detail.actions';
import {SearchDocument} from '../../modules/models/search-document';
import {AvailableYear, PeriodicalItemYear} from '../../modules/models/periodical-item';

export interface PeriodicalDetailState {
  document: any;
  years: PeriodicalItemYear[];
  availableYears: AvailableYear[];
  loading: boolean;
  error: any;
}

export const initialState: PeriodicalDetailState = {
  document: null,
  years: [],
  availableYears: [],
  loading: false,
  error: null,
};

export const periodicalDetailReducer = createReducer(
  initialState,
  on(loadPeriodical, state => ({ ...state, loading: true })),
  on(loadPeriodicalSuccess, (state, { document, years, availableYears }) => ({
    ...state,
    loading: false,
    document,
    years,
    availableYears
  })),
  on(loadPeriodicalFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
