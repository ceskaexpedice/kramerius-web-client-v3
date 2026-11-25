import {createAction, props} from '@ngrx/store';
import {AuthTokens, User} from '../auth.models';

export const login = createAction(
  '[Auth] Login',
  props<{ returnUrl?: string }>()
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ tokens: AuthTokens; user: User }>()
);

export const loginFailure = createAction(
  '[Auth] Login Failure',
  props<{ error: string }>()
);

export const exchangeCodeForToken = createAction(
  '[Auth] Exchange Code For Token',
  props<{ code: string }>()
);

export const exchangeCodeForTokenSuccess = createAction(
  '[Auth] Exchange Code For Token Success',
  props<{ tokens: AuthTokens }>()
);

export const exchangeCodeForTokenFailure = createAction(
  '[Auth] Exchange Code For Token Failure',
  props<{ error: string }>()
);

/**
 * The access token expired (or the API rejected it with 401). The backend has
 * no token refresh, so the local session ends and the user is asked to log in
 * again. Keycloak is not involved: its SSO session usually lets that next login
 * finish without a password prompt.
 */
export const sessionExpired = createAction(
  '[Auth] Session Expired'
);

export const logout = createAction(
  '[Auth] Logout'
);

export const checkAuthStatus = createAction(
  '[Auth] Check Auth Status'
);

export const setUser = createAction(
  '[Auth] Set User',
  props<{ user: User }>()
);

export const clearError = createAction(
  '[Auth] Clear Error'
);