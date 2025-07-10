import { createFeatureSelector, createSelector } from '@ngrx/store';
import {PeriodicalDetailState} from './periodical-detail.reducer';

export const selectPeriodicalState = createFeatureSelector<PeriodicalDetailState>('periodical');
export const selectPeriodicalDocument = createSelector(selectPeriodicalState, state => state.document);
export const selectPeriodicalChildren = createSelector(selectPeriodicalState, state => state.children || []);
export const selectPeriodicalYears = createSelector(selectPeriodicalState, state => state.years);
export const selectAvailableYears = createSelector(selectPeriodicalState, state => state.availableYears);
export const selectPeriodicalLoading = createSelector(selectPeriodicalState, state => state.loading);
export const selectPeriodicalError = createSelector(selectPeriodicalState, state => state.error);
export const selectPeriodicalMetadata = createSelector(selectPeriodicalState, state => state.metadata);
