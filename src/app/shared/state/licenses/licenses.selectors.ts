import { createFeatureSelector, createSelector } from '@ngrx/store';
import { LicensesState } from './licenses.reducer';

export const selectLicensesState = createFeatureSelector<LicensesState>('licenses');

export const selectLicenses = createSelector(selectLicensesState, state => state.data);
export const selectLicensesLoading = createSelector(selectLicensesState, state => state.loading);
export const selectLicensesError = createSelector(selectLicensesState, state => state.error);
export const selectLicensesQuery = createSelector(selectLicensesState, state => state.query);
export const selectLicensesCurrentPage = createSelector(selectLicensesState, state => state.currentPage);
export const selectLicensesPageSize = createSelector(selectLicensesState, state => state.pageSize);
export const selectLicensesTotalCount = createSelector(selectLicensesState, state => state.totalCount);
export const selectLicensesHasMore = createSelector(selectLicensesState, state => state.hasMore);