import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { EnvironmentService } from '../../shared/services/environment.service';

/**
 * Attaches the CDK access token to requests for our own API.
 *
 * The backend has no token refresh, so an access token cannot be renewed. When
 * it has expired, or the API rejects it with 401, the local session ends
 * (`AuthService.expireSession`) and the user is asked to log in again. The
 * request itself continues anonymously, which is what the backend would have
 * served it as anyway.
 */
export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const env = inject(EnvironmentService);

  // Skip auth endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Only our own backend participates in the CDK session. A third-party host
  // (the AI proxy, above all) has its own authorization and its own reasons to
  // answer 401 — letting such a response end the CDK session would log the
  // user out for a problem that was never theirs. Relative URLs are ours by
  // definition; absolute ones must match the API origin.
  if (!isOwnApi(req.url, env)) {
    return next(req);
  }

  const token = authService.getAccessToken();
  if (!token) {
    return next(req);
  }

  if (authService.isTokenExpired()) {
    authService.expireSession();
    return next(req);
  }

  return next(addTokenToRequest(req, token)).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        authService.expireSession();
      }
      return throwError(() => error);
    })
  );
};

function addTokenToRequest(req: HttpRequest<any>, token: string): HttpRequest<any> {
  return req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('/auth/login') || url.includes('/auth/token');
}

/**
 * Whether a request targets the backend that issued the CDK session, and so may
 * carry its token and end the session on 401.
 *
 * A URL without a scheme is relative to the app itself and always qualifies. An
 * absolute URL qualifies only when its origin matches the configured API base —
 * an unparseable or unconfigured one does not, so the conservative outcome is
 * to leave the request alone rather than attach a token to an unknown host.
 */
function isOwnApi(url: string, env: EnvironmentService): boolean {
  if (!/^https?:\/\//i.test(url)) {
    return true;
  }

  const apiUrl = env.getApiUrl('user') || env.getApiConfigBaseUrl();
  if (!apiUrl) {
    return false;
  }

  try {
    return new URL(url).origin === new URL(apiUrl, window.location.origin).origin;
  } catch {
    return false;
  }
}
