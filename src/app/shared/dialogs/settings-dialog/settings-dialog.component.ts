import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { SettingsContentComponent } from '../../../modules/settings/components/settings-content/settings-content.component';
import { SettingsService } from '../../../modules/settings/settings.service';
import { Settings } from '../../../modules/settings/settings.model';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-settings-dialog',
  imports: [
    FormsModule,
    SettingsContentComponent,
    SidebarDialogLayoutComponent
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent {

  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private settingsService = inject(SettingsService);

  dialogConfig: DialogConfig = {
    title: 'settings',
    showSaveButton: true,
    showCancelButton: true,
    sections: [
      { key: 'display', label: 'settings-section-display', icon: 'icon-light-dark' },
      ...(this.authService.hasValidToken() ? [{ key: 'account', label: 'settings-section-account', icon: 'icon-user-square' }] : []),
      // { key: 'reading', label: 'settings-section-reading', icon: 'icon-volume-high' },
      // { key: 'preferences', label: 'settings-section-user-preferences', icon: 'icon-settings-4' },
      { key: 'accessibility', label: 'settings-section-accessibility', icon: 'icon-accesibility' },
      { key: 'experimental', label: 'settings-section-experimental', icon: 'icon-code-2' },
      { key: 'gdpr', label: 'settings-section-gdpr', icon: 'icon-shield-tick' },
    ]
  };

  activeSection = signal<string>('display');

  localSettings = signal<Settings>(this.settingsService.getSettingsCopy());

  save() {
    const settingsToSave = this.localSettings();
    this.settingsService.settings = settingsToSave;
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }

  onSectionChange(section: string) {
    this.activeSection.set(section);
  }

  onSettingsChange(settings: Settings) {
    this.localSettings.set(settings);
  }

}
