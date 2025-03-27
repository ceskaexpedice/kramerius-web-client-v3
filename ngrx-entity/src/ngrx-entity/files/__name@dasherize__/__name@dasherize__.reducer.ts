import { createReducer, on } from '@ngrx/store';
import * as <%= classify(name) %>Actions from './<%= dasherize(name) %>.actions';

export interface <%= classify(name) %>State {
  loading: boolean;
  data: any[];
  error: any;
}

export const initialState: <%= classify(name) %>State = {
  loading: false,
  data: [],
  error: null,
};

export const <%= camelize(name) %>Reducer = createReducer(
  initialState,
  on(<%= classify(name) %>Actions.load<%= classify(name) %>, state => ({ ...state, loading: true })),
  on(<%= classify(name) %>Actions.load<%= classify(name) %>Success, (state, { data }) => ({
    ...state,
    loading: false,
    data
  })),
  on(<%= classify(name) %>Actions.load<%= classify(name) %>Failure, (state, { error }) => ({
    ...state,
    loading: false,
    error
  }))
);
