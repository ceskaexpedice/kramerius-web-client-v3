import { createReducer, on } from '@ngrx/store';
import {
  loadMusic, loadMusicFailure, loadMusicSuccess
} from './music-detail.actions';
import {Metadata} from '../../../shared/models/metadata.model';
import {SoundTrackModel} from '../../models/sound-track.model';

export interface MusicDetailState {
  metadata: Metadata | null;
  tracks: SoundTrackModel[] | null;
  loading: boolean;
  error: any;
}

export const initialState: MusicDetailState = {
  metadata: null,
  tracks: [],
  loading: false,
  error: null
};

export const musicDetailReducer = createReducer(
  initialState,
  on(loadMusic, state => ({ ...state, loading: true })),
  on(loadMusicSuccess, (state, { metadata, tracks }) => ({
    ...state,
    loading: false,
    metadata,
    tracks
  })),
  on(loadMusicFailure, (state, { error }) => ({ ...state, loading: false, error }))
);
