import {Component, inject} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import * as AuthActions from '../store/auth.actions';
import {Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {selectIsAuthenticated, selectUser} from '../store';
import {AsyncPipe} from '@angular/common';
import {MenuComponent, MenuItem} from '../../../shared/components/menu/menu.component';
import {_} from '../../../shared/translation/translate-placeholder';
import {SettingsService} from '../../../modules/settings/settings.service';
import {DownloadHistoryService} from '../../../shared/services/download-history.service';
import {ConfigService} from '../../config/config.service';

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
    settings: 'settings',
    downloadHistory: 'downloadHistory',
    help: 'help',
    logout: 'logout'
  }

  private router = inject(Router);
  private store = inject(Store);
  private settingsService = inject(SettingsService);
  private downloadHistoryService = inject(DownloadHistoryService);
  private config = inject(ConfigService);

  private readonly showDownloadHistory = this.config.features.showExportHistory ?? false;

  /**
   * When `features.keycloak` is off there is no identity provider, so neither the
   * login button nor the signed-in user menu is rendered.
   */
  readonly loginEnabled = this.config.isLoginEnabled();

  userMenuItems: MenuItem[] = [
    { id: this.userMenuItemsIds.account, label: _('user-info--my-account'), icon: 'user-square' },
    { id: this.userMenuItemsIds.settings, label: _('settings'), icon: 'settings-2' },
    ...(this.showDownloadHistory
      ? [{ id: this.userMenuItemsIds.downloadHistory, label: _('download-history'), icon: 'document-download' }]
      : []),
    // { id: this.userMenuItemsIds.help, label: _('user-info--help'), icon: 'question', route: [APP_ROUTES_ENUM.HELP]},
    { id: this.userMenuItemsIds.logout, label: _('user-info--logout'), icon: 'logout', variant: 'danger' }
  ];

  isAuthenticated = this.store.select(selectIsAuthenticated);
  user = this.store.select(selectUser);

  onUserMenu(item: MenuItem) {
    if (item.id === this.userMenuItemsIds.account) {
      this.settingsService.openSettingsDialog('account');
    } else if (item.id === this.userMenuItemsIds.settings) {
      this.settingsService.openSettingsDialog();
    } else if (item.id === this.userMenuItemsIds.downloadHistory) {
      this.downloadHistoryService.openDialog();
    } else if (item.id === this.userMenuItemsIds.logout) {
      this.logout();
    }
  }

  login() {
    const returnUrl = this.router.url;
    this.router.navigate(['pages/terms'], { queryParams: { returnUrl } });
  }

  logout() {
    this.store.dispatch(AuthActions.logout());
  }

  truncateDisplayName(name: string | null | undefined): string {
    if (!name) return '-';
    return name.length > 13 ? name.substring(0, 13) + '...' : name;
  }

}
