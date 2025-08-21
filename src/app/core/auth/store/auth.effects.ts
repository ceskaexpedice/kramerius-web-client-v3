import {inject, Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, tap} from 'rxjs/operators';
import {of} from 'rxjs';
import {AuthService} from '../auth.service';
import * as AuthActions from './auth.actions';

@Injectable()
export class AuthEffects {

  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private router = inject(Router);

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      tap(({ returnUrl }) => this.authService.login(returnUrl))
    ), { dispatch: false }
  );

  exchangeCodeForToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.exchangeCodeForToken),
      switchMap(({ code }) =>
        this.authService.exchangeCodeForToken(code).pipe(
          map(tokens => AuthActions.exchangeCodeForTokenSuccess({ tokens })),
          catchError(error =>
            of(AuthActions.exchangeCodeForTokenFailure({ error: error.message || 'Token exchange failed' }))
          )
        )
      )
    )
  );

  exchangeCodeSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.exchangeCodeForTokenSuccess),
      tap(() => {
        const originalRoute = this.authService.getOriginalRoute();
        if (originalRoute) {
          this.authService.clearOriginalRoute();
          this.router.navigateByUrl(originalRoute);
        } else {
          this.router.navigate(['/']);
        }
      })
    ), { dispatch: false }
  );

  refreshToken$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.refreshToken),
      switchMap(() =>
        this.authService.refreshToken().pipe(
          map(tokens => AuthActions.refreshTokenSuccess({ tokens })),
          catchError(error =>
            of(AuthActions.refreshTokenFailure({ error: error.message || 'Token refresh failed' }))
          )
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      tap(() => this.authService.logout())
    ), { dispatch: false }
  );

  checkAuthStatus$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.checkAuthStatus),
      switchMap(() => {
        if (this.authService.hasValidToken()) {
          const user = this.authService['getStoredUser']();
          const tokens = this.authService['getStoredTokens']();
          if (user && tokens) {
            return of(AuthActions.loginSuccess({ tokens, user }));
          }
        }
        return of(AuthActions.logout());
      })
    )
  );
}