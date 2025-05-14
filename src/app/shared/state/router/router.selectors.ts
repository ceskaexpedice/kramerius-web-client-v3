import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RouterReducerState } from '@ngrx/router-store';

export const selectRouter = createFeatureSelector<RouterReducerState<any>>('router');

export const selectRouterQueryParams = createSelector(
  selectRouter,
  router => router?.state?.root?.queryParams || {}
);

export const selectRouterParams = createSelector(
  selectRouter,
  router => {
    let state = router?.state?.root;
    while (state?.firstChild) {
      state = state.firstChild;
    }
    return state?.params || {};
  }
);
