import {Component, inject} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import * as AuthActions from '../store/auth.actions';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {SelectComponent} from '../../../shared/components/select/select.component';
import {selectIsAuthenticated, selectUser} from '../store';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-user-info',
  imports: [
    TranslatePipe,
    SelectComponent,
    AsyncPipe,
  ],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss'
})
export class UserInfoComponent {

  private router = inject(Router);
  private store = inject(Store);

  isAuthenticated = this.store.select(selectIsAuthenticated);
  user = this.store.select(selectUser);

  constructor() {
    // Optionally, you can subscribe to the user observable if you need to perform actions based on user changes
    this.user.subscribe(user => console.log('User info updated:', user));
  }

  login() {
    const currentUrl = this.router.url;
    this.store.dispatch(AuthActions.login({ returnUrl: currentUrl }));
  }

  logout() {
    this.store.dispatch(AuthActions.logout());
  }

}
