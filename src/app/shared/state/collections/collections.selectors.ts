import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CollectionsState } from './collections.reducer';

export const selectCollectionsState = createFeatureSelector<CollectionsState>('collections');

export const selectCollections = createSelector(selectCollectionsState, state => state.data);
export const selectCollectionsLoading = createSelector(selectCollectionsState, state => state.loading);
export const selectCollectionsError = createSelector(selectCollectionsState, state => state.error);
export const selectCollectionsQuery = createSelector(selectCollectionsState, state => state.query);
export const selectCollectionsCurrentPage = createSelector(selectCollectionsState, state => state.currentPage);
export const selectCollectionsPageSize = createSelector(selectCollectionsState, state => state.pageSize);
export const selectCollectionsTotalCount = createSelector(selectCollectionsState, state => state.totalCount);
export const selectCollectionsHasMore = createSelector(selectCollectionsState, state => state.hasMore);