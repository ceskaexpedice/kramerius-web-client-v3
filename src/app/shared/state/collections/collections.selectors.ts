import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CollectionsState } from './collections.reducer';

export const selectCollectionsState = createFeatureSelector<CollectionsState>('collections');

export const selectCollections = createSelector(selectCollectionsState, state => state.data);
export const selectCollectionsLoading = createSelector(selectCollectionsState, state => state.loading);
export const selectCollectionsError = createSelector(selectCollectionsState, state => state.error);