import { createReducer, on } from '@ngrx/store';
import * as BooksActions from './books.actions';

export interface BooksState {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: BooksState = {
  loading: false,
  data: [],
  error: null
};

export const booksReducer = createReducer(
  initialState,
  on(BooksActions.loadBooks, state => ({ ...state, loading: true })),
  on(BooksActions.loadBooksSuccess, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(BooksActions.loadBooksFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
