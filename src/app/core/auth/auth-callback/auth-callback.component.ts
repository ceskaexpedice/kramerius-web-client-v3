import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import * as AuthActions from '../store/auth.actions';
import {AuthService} from '../auth.service';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss'
})
export class AuthCallbackComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private store = inject(Store);
  private authService = inject(AuthService);

  loading = true;
  error: string | null = null;

  ngOnInit() {
    // Check if user is already authenticated to prevent unnecessary processing
    if (this.authService.hasValidToken()) {
      console.log('User already authenticated, redirecting to home');
      this.navigateToTarget();
      return;
    }

    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];
      const errorDescription = params['error_description'];

      if (error) {
        this.cleanUrlAndHandleError(errorDescription || error);
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

  private exchangeCodeForToken(code: string) {
    this.store.dispatch(AuthActions.exchangeCodeForToken({ code }));
  }

  private handleError(errorMessage: string) {
    this.loading = false;
    this.error = errorMessage;
    console.error('Auth callback error:', errorMessage);

    // setTimeout(() => {
    //   this.router.navigate(['/'], {
    //     queryParams: { authError: 'Authentication failed' }
    //   });
    // }, 3000);
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
