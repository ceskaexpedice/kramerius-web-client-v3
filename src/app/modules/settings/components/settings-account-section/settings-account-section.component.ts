import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';
import {AuthService} from '../../../../core/auth/auth.service';
import {AuthDataDialogComponent} from './auth-data-dialog/auth-data-dialog.component';
import {VersionService} from '../../../../shared/services/version.service';

@Component({
  selector: 'app-settings-account-section',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslatePipe,
  ],
  templateUrl: './settings-account-section.component.html',
  styleUrl: './settings-account-section.component.scss',
})
export class SettingsAccountSectionComponent {
  authService = inject(AuthService);
  private dialog = inject(MatDialog);
  private versionService = inject(VersionService);

  async openAuthDataDialog() {
    const data = this.authService.getRawUserSession();
    const { version: apiVersion, indexerVersion, baseApiUrl } = await this.versionService.getApiInfo();

    const payload = {
      clientVersion: this.versionService.getClientVersion(),
      apiVersion,
      indexerVersion,
      baseApiUrl,
      ...data,
    };

    this.dialog.open(AuthDataDialogComponent, {
      data: {userJson: JSON.stringify(payload, null, 2)},
      width: '60vw',
      maxHeight: '90vh',
    });
  }

  logout() {
    this.authService.logout();
  }
}
