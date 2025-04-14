import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RouterReducerState } from '@ngrx/router-store';

export const selectRouter = createFeatureSelector<RouterReducerState<any>>('router');

export const selectRouterQueryParams = createSelector(
  selectRouter,
  router => router?.state?.root?.queryParams || {}
);

export const selectRouterParams = createSelector(
  selectRouter,
  router => router?.state?.root?.params || {}
);
