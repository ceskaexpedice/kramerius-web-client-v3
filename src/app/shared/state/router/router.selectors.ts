import { createFeatureSelector, createSelector } from '@ngrx/store';
import { RouterReducerState } from '@ngrx/router-store';

export const selectRouter = createFeatureSelector<RouterReducerState<any>>('router');

function getDeepestChild(route: any): any {
  if (!route) return null;
  while (route?.firstChild) {
    route = route.firstChild;
  }
  return route;
}

export const selectRouterQueryParams = createSelector(
  selectRouter,
  router => router?.state?.root?.queryParams || {}
);

export const selectRouterParams = createSelector(
  selectRouter,
  router => {
    const deepest = getDeepestChild(router?.state?.root);
    return deepest?.params || {};
  }
);
