import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PeriodicalsState } from './periodicals.reducer';

export const selectPeriodicalsState = createFeatureSelector<PeriodicalsState>('periodicals');

export const selectPeriodicals = createSelector(selectPeriodicalsState, state => state.data);
export const selectPeriodicalsLoading = createSelector(selectPeriodicalsState, state => state.loading);
export const selectPeriodicalsError = createSelector(selectPeriodicalsState, state => state.error);
