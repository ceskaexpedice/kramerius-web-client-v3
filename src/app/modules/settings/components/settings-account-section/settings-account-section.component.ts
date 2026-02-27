import {Component, inject} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {TranslateModule} from '@ngx-translate/core';
import {AuthService} from '../../../../core/auth/auth.service';
import {AuthDataDialogComponent} from './auth-data-dialog/auth-data-dialog.component';

@Component({
  selector: 'app-settings-account-section',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    TranslateModule,
  ],
  templateUrl: './settings-account-section.component.html',
  styleUrl: './settings-account-section.component.scss',
})
export class SettingsAccountSectionComponent {
  authService = inject(AuthService);
  private dialog = inject(MatDialog);

  openAuthDataDialog() {
    const data = this.authService.getRawUserSession();

    this.dialog.open(AuthDataDialogComponent, {
      data: {userJson: JSON.stringify(data, null, 2)},
      width: '60vw',
      maxHeight: '90vh',
    });
  }

  logout() {
    this.authService.logout();
  }
}
