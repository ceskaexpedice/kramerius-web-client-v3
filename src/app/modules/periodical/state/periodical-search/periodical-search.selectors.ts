import { createFeatureSelector, createSelector } from '@ngrx/store';
import { PeriodicalSearchState } from './periodical-search.reducer';
import { selectRouterQueryParams } from '../../../../shared/state/router/router.selectors';
import { SolrOperators } from '../../../../core/solr/solr-helpers';

export const selectPeriodicalSearchState = createFeatureSelector<PeriodicalSearchState>('periodical-search');
export const selectPeriodicalSearchStateResults = createSelector(selectPeriodicalSearchState, state => state.results);
export const selectPeriodicalSearchStateTotalCount = createSelector(selectPeriodicalSearchState, state => state.totalCount);
export const selectPeriodicalSearchStateFacets = createSelector(selectPeriodicalSearchState, state => state.facets || {});
export const selectPeriodicalSearchStateLoading = createSelector(selectPeriodicalSearchState, state => state?.loading);
export const selectPeriodicalSearchStateFacetsLoading = createSelector(selectPeriodicalSearchState, state => state?.facetsLoading);
export const selectPeriodicalSearchStateError = createSelector(selectPeriodicalSearchState, state => state.error);

export const selectFacetOperators = createSelector(
  selectRouterQueryParams,
  (params): { [field: string]: SolrOperators } => {
    const operators: { [field: string]: SolrOperators } = {};

    Object.entries(params).forEach(([key, value]) => {
      if (key.endsWith('_operator') && (value === SolrOperators.and || value === SolrOperators.or)) {
        const field = key.replace('_operator', '');
        operators[field] = value;
      }
    });

    return operators;
  }
);
