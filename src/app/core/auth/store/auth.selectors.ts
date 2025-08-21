import {createFeatureSelector, createSelector} from '@ngrx/store';
import {AuthState} from '../auth.models';
import {authFeatureKey} from './auth.reducer';

export const selectAuthState = createFeatureSelector<AuthState>(authFeatureKey);

export const selectIsAuthenticated = createSelector(
  selectAuthState,
  (state: AuthState) => state.isAuthenticated
);

export const selectAuthTokens = createSelector(
  selectAuthState,
  (state: AuthState) => state.tokens
);

export const selectUser = createSelector(
  selectAuthState,
  (state: AuthState) => state.user
);

export const selectAuthLoading = createSelector(
  selectAuthState,
  (state: AuthState) => state.loading
);

export const selectAuthError = createSelector(
  selectAuthState,
  (state: AuthState) => state.error
);

export const selectOriginalRoute = createSelector(
  selectAuthState,
  (state: AuthState) => state.originalRoute
);

export const selectAccessToken = createSelector(
  selectAuthTokens,
  (tokens) => tokens?.accessToken
);

export const selectIsTokenExpired = createSelector(
  selectAuthTokens,
  (tokens) => {
    if (!tokens) return true;
    return Date.now() >= tokens.expiresAt;
  }
);