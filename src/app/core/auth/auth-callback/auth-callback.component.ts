import {Component, DestroyRef, inject, OnInit, signal} from '@angular/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {Actions, ofType} from '@ngrx/effects';
import * as AuthActions from '../store/auth.actions';
import {AuthService} from '../auth.service';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  templateUrl: './auth-callback.component.html',
  imports: [
    TranslatePipe,
  ],
  styleUrl: './auth-callback.component.scss',
})
export class AuthCallbackComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private actions$ = inject(Actions);
  private authService = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  // Signals, not plain fields: the failure arrives asynchronously and the app
  // runs without zone.js, so a field change would never reach the view.
  readonly loading = signal(true);
  readonly failed = signal(false);

  ngOnInit() {
    // Check if user is already authenticated to prevent unnecessary processing
    if (this.authService.hasValidToken()) {
      this.navigateToTarget();
      return;
    }

    // The exchange runs in an effect; without listening for its failure the
    // page would keep showing the spinner forever.
    this.actions$.pipe(
      ofType(AuthActions.exchangeCodeForTokenFailure),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ error }) => this.handleError(error));

    this.route.queryParams.pipe(
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(params => {
      const code = params['code'];
      const error = params['error'];

      if (error) {
        this.cleanUrlAndHandleError(error);
        return;
      }

      if (code) {
        // Clean URL immediately to prevent reprocessing on back navigation
        this.cleanUrl();
        this.exchangeCodeForToken(code);
      } else {
        this.handleError('No authorization code received');
      }
    });
  }

  goHome() {
    this.router.navigate(['/']);
  }

  private exchangeCodeForToken(code: string) {
    this.store.dispatch(AuthActions.exchangeCodeForToken({ code }));
  }

  /**
   * The detail is logged for debugging only. The page shows a generic message:
   * text from the URL (`error_description`) must never be rendered, otherwise a
   * crafted link could put arbitrary text on the site.
   */
  private handleError(errorMessage: string) {
    this.loading.set(false);
    this.failed.set(true);
    console.error('Auth callback error:', errorMessage);
  }

  private cleanUrl() {
    // Use history.replaceState to remove query parameters without triggering navigation
    const url = new URL(window.location.href);
    url.search = ''; // Clear all query parameters
    window.history.replaceState({}, '', url.toString());
  }

  private cleanUrlAndHandleError(errorMessage: string) {
    this.cleanUrl();
    this.handleError(errorMessage);
  }

  private navigateToTarget() {
    const originalRoute = this.authService.getOriginalRoute();
    if (originalRoute) {
      this.authService.clearOriginalRoute();
      this.router.navigateByUrl(originalRoute);
    } else {
      this.router.navigate(['/']);
    }
  }
}
