export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  expiresAt: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  roles?: string[];
  licenses?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  tokens: AuthTokens | null;
  user: User | null;
  loading: boolean;
  error: string | null;
  originalRoute?: string;
}

export interface AuthCallbackParams {
  code?: string;
  state?: string;
  error?: string;
  error_description?: string;
}