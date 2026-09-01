import { createFeatureSelector, createSelector } from '@ngrx/store';
import {PeriodicalDetailState} from './periodical-detail.reducer';
import {selectRouterQueryParams} from '../../../../shared/state/router/router.selectors';
import {SolrOperators} from '../../../../core/solr/solr-helpers';

export const selectPeriodicalState = createFeatureSelector<PeriodicalDetailState>('periodical-detail');
export const selectPeriodicalDocument = createSelector(selectPeriodicalState, state => state?.document);
export const selectPeriodicalChildren = createSelector(selectPeriodicalState, state => state?.children || []);
export const selectPeriodicalYears = createSelector(selectPeriodicalState, state => state?.years);
export const selectAvailableYears = createSelector(selectPeriodicalState, state => state?.availableYears);
export const selectPeriodicalLoading = createSelector(selectPeriodicalState, state => state?.loading);
export const selectPeriodicalError = createSelector(selectPeriodicalState, state => state?.error);
export const selectPeriodicalMetadata = createSelector(selectPeriodicalState, state => state?.metadata);
export const selectPeriodicalSearchParams = createSelector(selectPeriodicalState, state => state?.searchParams);

export const selectPeriodicalFacetOperators = createSelector(
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

/**
 * Cache key for one month of issues.
 *
 * The parent volume UUID is part of the key because year/month alone are not
 * unique across periodicals: opening another title and landing on the same month
 * would otherwise hit the previous title's cached issues. Shared by the reducer
 * and the selectors so both sides always agree on the key format.
 */
export function monthCacheKey(parentVolumeUuid: string, year: number, month: number): string {
  return `${parentVolumeUuid}|${year}-${String(month).padStart(2, '0')}`;
}

export const selectMonthIssues = (parentVolumeUuid: string, year: number, month: number) => createSelector(
  selectPeriodicalState,
  s => s.monthIssues[monthCacheKey(parentVolumeUuid, year, month)] ?? []
);

export const selectMonthLoading = (parentVolumeUuid: string, year: number, month: number) => createSelector(
  selectPeriodicalState,
  s => !!s.monthLoading[monthCacheKey(parentVolumeUuid, year, month)]
);

export const selectPidFromAvailableYears = (year: string) => createSelector(
  selectAvailableYears,
  years => years.find(y => y.year === year)?.pid || ''
);
