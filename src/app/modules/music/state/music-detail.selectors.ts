import { createFeatureSelector, createSelector } from '@ngrx/store';
import {MusicDetailState} from './music-detail.reducer';

export const selectMusicState = createFeatureSelector<MusicDetailState>('music');
export const selectMusicDocument = createSelector(selectMusicState, state => state.document);
export const selectMusicMetadata = createSelector(selectMusicState, state => state.metadata);
export const selectMusicLoading = createSelector(selectMusicState, state => state.loading);
export const selectMusicError = createSelector(selectMusicState, state => state.error);
