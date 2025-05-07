import { createFeatureSelector, createSelector } from '@ngrx/store';
import {PeriodicalDetailState} from './periodical-detail.reducer';
import {selectRouterQueryParams} from '../router/router.selectors';

export const selectPeriodicalDetailState =
  createFeatureSelector<PeriodicalDetailState>('periodical-detail');

export const selectPeriodicalDocument = createSelector(
  selectPeriodicalDetailState,
  state => state.document
);

export const selectPeriodicalYears = createSelector(
  selectPeriodicalDetailState,
  state => state.years
);

export const selectAvailablePeriodicalYears = createSelector(
  selectPeriodicalDetailState,
  state => state.availableYears
);

export const selectPeriodicalLoading = createSelector(
  selectPeriodicalDetailState,
  state => state.loading
);

export const selectPeriodicalError = createSelector(
  selectPeriodicalDetailState,
  state => state.error
);

export const selectPeriodicalUuid = createSelector(
  selectRouterQueryParams,
  params => params['uuid']
);
