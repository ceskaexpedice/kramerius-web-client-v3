import { createFeatureSelector, createSelector } from '@ngrx/store';
import { GenresState } from './genres.reducer';

export const selectGenresState = createFeatureSelector<GenresState>('genres');

export const selectGenres = createSelector(selectGenresState, state => state.data);
export const selectGenresLoading = createSelector(selectGenresState, state => state.loading);
export const selectGenresError = createSelector(selectGenresState, state => state.error);
