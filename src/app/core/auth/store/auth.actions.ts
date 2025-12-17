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

export const refreshToken = createAction(
  '[Auth] Refresh Token'
);

export const refreshTokenSuccess = createAction(
  '[Auth] Refresh Token Success',
  props<{ tokens: AuthTokens }>()
);

export const refreshTokenFailure = createAction(
  '[Auth] Refresh Token Failure',
  props<{ error: string }>()
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