import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpEvent } from '@angular/common/http';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { throwError, BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';
import { EnvironmentService } from '../../shared/services/environment.service';

let isRefreshing = false;
let isLoggingOut = false;
let refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const env = inject(EnvironmentService);

  // Skip auth endpoints
  if (isAuthEndpoint(req.url)) {
    return next(req);
  }

  // Only our own backend participates in the CDK session. A third-party host
  // (the AI proxy, above all) has its own authorization and its own reasons to
  // answer 401 — letting such a response reach handle401Error() below would
  // refresh, and then drop, a CDK session that was never the problem. Relative
  // URLs are ours by definition; absolute ones must match the API origin.
  if (!isOwnApi(req.url, env)) {
    return next(req);
  }

  const token = authService.getAccessToken();

  let authReq = req;
  if (token && !authService.isTokenExpired()) {
    authReq = addTokenToRequest(req, token);
  }

  return next(authReq).pipe(
    catchError(error => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        return handle401Error(req, next, authService);
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
 * carry its token and trigger its refresh/logout handling.
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

function handle401Error(req: HttpRequest<any>, next: HttpHandlerFn, authService: AuthService): Observable<HttpEvent<any>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    return authService.refreshToken().pipe(
      switchMap((tokens) => {
        isRefreshing = false;
        isLoggingOut = false;
        refreshTokenSubject.next(tokens.accessToken);
        return next(addTokenToRequest(req, tokens.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        // refreshToken() already logs out on failure; guard against a second,
        // redundant logout navigation from here.
        if (!isLoggingOut) {
          isLoggingOut = true;
          authService.logout();
        }
        return throwError(() => error);
      })
    );
  } else {
    return refreshTokenSubject.pipe(
      filter(token => token != null),
      take(1),
      switchMap(token => next(addTokenToRequest(req, token!)))
    );
  }
}
