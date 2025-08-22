import {Component, inject} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import * as AuthActions from '../store/auth.actions';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {SelectComponent} from '../../../shared/components/select/select.component';
import {selectIsAuthenticated, selectUser} from '../store';
import {AsyncPipe} from '@angular/common';
import {MenuComponent, MenuItem} from '../../../shared/components/menu/menu.component';
import {APP_ROUTES_ENUM} from '../../../app.routes';

@Component({
  selector: 'app-user-info',
  imports: [
    TranslatePipe,
    SelectComponent,
    AsyncPipe,
    MenuComponent,
  ],
  templateUrl: './user-info.component.html',
  styleUrl: './user-info.component.scss'
})
export class UserInfoComponent {

  userMenuItemsIds = {
    account: 'account',
    saved: 'saved',
    help: 'help',
    logout: 'logout'
  }

  userMenuItems: MenuItem[] = [
    { id: this.userMenuItemsIds.account, label: 'My Account', icon: 'user-square', route: ['/account'] },
    { id: this.userMenuItemsIds.saved, label: 'Saved Lists', icon: 'heart', route: [APP_ROUTES_ENUM.SAVED_LISTS] },
    { id: this.userMenuItemsIds.help, label: 'Help', icon: 'question', route: ['/help']},
    { id: this.userMenuItemsIds.logout, label: 'Log out', icon: 'logout', variant: 'danger' }
  ];

  private router = inject(Router);
  private store = inject(Store);

  isAuthenticated = this.store.select(selectIsAuthenticated);
  user = this.store.select(selectUser);

  constructor() {
    // Optionally, you can subscribe to the user observable if you need to perform actions based on user changes
    this.user.subscribe(user => console.log('User info updated:', user));
  }

  onUserMenu(item: MenuItem) {
    if (item.id === this.userMenuItemsIds.logout) {
      this.logout();
    }
  }

  login() {
    const currentUrl = this.router.url;
    this.store.dispatch(AuthActions.login({ returnUrl: currentUrl }));
  }

  logout() {
    this.store.dispatch(AuthActions.logout());
  }

}
