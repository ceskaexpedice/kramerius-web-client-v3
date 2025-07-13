import { createReducer, on } from '@ngrx/store';
import {
  loadMusic, loadMusicFailure, loadMusicSuccess
} from './music-detail.actions';
import {Metadata} from '../../../shared/models/metadata.model';

export interface MusicDetailState {
  document: any | null;
  metadata: Metadata | null;
  tracks: any[] | null;
  loading: boolean;
  error: any;
}

export const initialState: MusicDetailState = {
  document: null,
  metadata: null,
  tracks: [],
  loading: false,
  error: null
};

export const musicDetailReducer = createReducer(
  initialState,
  on(loadMusic, state => ({ ...state, loading: true })),
  on(loadMusicSuccess, (state, { document, metadata, tracks }) => ({
    ...state,
    loading: false,
    document,
    metadata,
    tracks
  })),
  on(loadMusicFailure, (state, { error }) => ({ ...state, loading: false, error }))
);
