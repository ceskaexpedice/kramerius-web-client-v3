import { createReducer, on } from '@ngrx/store';
import * as GenresActions from './genres.actions';

export interface GenresState {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: GenresState = {
  loading: false,
  data: [],
  error: null,
};

export const genresReducer = createReducer(
  initialState,
  on(GenresActions.loadGenres, state => ({ ...state, loading: true })),
  on(GenresActions.loadGenresSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(GenresActions.loadGenresFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
