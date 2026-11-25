import { createFeatureSelector, createSelector } from '@ngrx/store';
import {MusicDetailState} from './music-detail.reducer';

export const selectMusicState = createFeatureSelector<MusicDetailState>('music');
export const selectMusicMetadata = createSelector(selectMusicState, state => state?.metadata ?? null);
export const selectMusicTracks = createSelector(
  selectMusicState,
  (state) => state?.tracks ?? []
);
export const selectMusicLoading = createSelector(selectMusicState, state => state?.loading);
/** Loading has finished for a document (so an empty track list really means no tracks). */
export const selectMusicTracksSettled = createSelector(
  selectMusicState,
  state => !!state && !state.loading && state.metadata !== null
);
export const selectMusicError = createSelector(selectMusicState, state => state.error);
