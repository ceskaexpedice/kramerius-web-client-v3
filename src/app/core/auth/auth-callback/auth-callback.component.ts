import {Component, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {Store} from '@ngrx/store';
import * as AuthActions from '../store/auth.actions';

@Component({
  selector: 'app-auth-callback',
  standalone: true,
  templateUrl: './auth-callback.component.html',
  styleUrl: './auth-callback.component.scss'
})
export class AuthCallbackComponent implements OnInit {

  private route = inject(ActivatedRoute);
  private store = inject(Store);

  loading = true;
  error: string | null = null;

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      const code = params['code'];
      const error = params['error'];
      const errorDescription = params['error_description'];

      if (error) {
        this.handleError(errorDescription || error);
        return;
      }

      if (code) {
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
}
