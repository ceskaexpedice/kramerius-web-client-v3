import {Component, inject} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import * as AuthActions from '../store/auth.actions';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {selectIsAuthenticated, selectUser} from '../store';
import {AsyncPipe} from '@angular/common';
import {MenuComponent, MenuItem} from '../../../shared/components/menu/menu.component';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {selectFoldersCount} from '../../../modules/saved-lists-page/state';
import {_} from '../../../shared/translation/translate-placeholder';

@Component({
  selector: 'app-user-info',
  imports: [
    TranslatePipe,
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
    { id: this.userMenuItemsIds.account, label: _('user-info--my-account'), icon: 'user-square', route: [APP_ROUTES_ENUM.PROFILE] },
    { id: this.userMenuItemsIds.saved, label: _('user-info--saved-lists'), icon: 'heart', route: [APP_ROUTES_ENUM.SAVED_LISTS] },
    { id: this.userMenuItemsIds.help, label: _('user-info--help'), icon: 'question', route: [APP_ROUTES_ENUM.HELP]},
    { id: this.userMenuItemsIds.logout, label: _('user-info--logout'), icon: 'logout', variant: 'danger' }
  ];

  private router = inject(Router);
  private store = inject(Store);

  isAuthenticated = this.store.select(selectIsAuthenticated);
  user = this.store.select(selectUser);

  savedListsCount = this.store.select(selectFoldersCount);

  constructor() {
    // Optionally, you can subscribe to the user observable if you need to perform actions based on user changes
    this.user.subscribe(user => console.log('User info updated:', user));

    // add saved lists count to the "Saved Lists" menu item label
    this.savedListsCount.subscribe(count => {
      const savedItem = this.userMenuItems.find(item => item.id === this.userMenuItemsIds.saved);
      if (savedItem) {
        savedItem.count = count;
      }
    });
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

  truncateDisplayName(name: string | null | undefined): string {
    if (!name) return '-';
    return name.length > 13 ? name.substring(0, 13) + '...' : name;
  }

}
