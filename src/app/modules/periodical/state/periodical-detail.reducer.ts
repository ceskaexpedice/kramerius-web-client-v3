import { createReducer, on } from '@ngrx/store';
import {
  loadPeriodical, loadPeriodicalFailure,
  loadPeriodicalSuccess
} from './periodical-detail.actions';
import {PeriodicalItem, PeriodicalItemChild, PeriodicalItemYear} from '../../models/periodical-item';
import {Metadata} from '../../../shared/models/metadata.model';

export interface PeriodicalDetailState {
  document: PeriodicalItem | null;
  metadata: Metadata | null;
  years: PeriodicalItemYear[];
  availableYears: PeriodicalItemYear[];
  children: PeriodicalItemChild[];
  loading: boolean;
  error: any;
}

export const initialState: PeriodicalDetailState = {
  document: null,
  metadata: null,
  years: [],
  availableYears: [],
  children: [],
  loading: false,
  error: null
};

export const periodicalDetailReducer = createReducer(
  initialState,
  on(loadPeriodical, state => ({ ...state, loading: true })),
  on(loadPeriodicalSuccess, (state, { document, metadata, years, availableYears, children }) => ({
    ...state,
    loading: false,
    document,
    metadata,
    years,
    availableYears: availableYears.length > 0 ? availableYears : state.availableYears,
    children: children || []
  })),
  on(loadPeriodicalFailure, (state, { error }) => ({ ...state, loading: false, error }))
);
