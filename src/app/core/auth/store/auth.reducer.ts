import {createReducer, on} from '@ngrx/store';
import {AuthState} from '../auth.models';
import * as AuthActions from './auth.actions';

export const authFeatureKey = 'auth';

export const initialState: AuthState = {
  isAuthenticated: false,
  tokens: null,
  user: null,
  loading: false,
  error: null,
  originalRoute: undefined
};

export const authReducer = createReducer(
  initialState,

  on(AuthActions.login, (state, { returnUrl }) => ({
    ...state,
    loading: true,
    error: null,
    originalRoute: returnUrl
  })),

  on(AuthActions.loginSuccess, (state, { tokens, user }) => ({
    ...state,
    isAuthenticated: true,
    tokens,
    user,
    loading: false,
    error: null
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    isAuthenticated: false,
    tokens: null,
    user: null,
    loading: false,
    error
  })),

  on(AuthActions.exchangeCodeForToken, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthActions.exchangeCodeForTokenSuccess, (state, { tokens }) => ({
    ...state,
    isAuthenticated: true,
    tokens,
    loading: false,
    error: null
  })),

  on(AuthActions.exchangeCodeForTokenFailure, (state, { error }) => ({
    ...state,
    isAuthenticated: false,
    tokens: null,
    user: null,
    loading: false,
    error
  })),

  on(AuthActions.refreshToken, (state) => ({
    ...state,
    loading: true,
    error: null
  })),

  on(AuthActions.refreshTokenSuccess, (state, { tokens }) => ({
    ...state,
    tokens,
    loading: false,
    error: null
  })),

  on(AuthActions.refreshTokenFailure, (state, { error }) => ({
    ...state,
    isAuthenticated: false,
    tokens: null,
    user: null,
    loading: false,
    error
  })),

  on(AuthActions.logout, () => ({
    ...initialState
  })),

  on(AuthActions.setUser, (state, { user }) => ({
    ...state,
    user
  })),

  on(AuthActions.clearError, (state) => ({
    ...state,
    error: null
  }))
);