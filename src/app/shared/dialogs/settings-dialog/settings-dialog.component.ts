import { Component, inject, signal } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatDialogRef} from '@angular/material/dialog';
import {SettingsContentComponent} from '../../../modules/settings/components/settings-content/settings-content.component';
import {SettingsService} from '../../../modules/settings/settings.service';
import {Settings} from '../../../modules/settings/settings.model';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';

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

  dialogConfig: DialogConfig = {
    title: 'settings',
    showSaveButton: true,
    showCancelButton: true,
    sections: [
      { key: 'display', label: 'settings-section-display', icon: 'icon-light-dark' },
      { key: 'reading', label: 'settings-section-reading', icon: 'icon-volume-high' },
      { key: 'preferences', label: 'settings-section-user-preferences', icon: 'icon-settings-4' },
      { key: 'accessibility', label: 'settings-section-accessibility', icon: 'icon-accesibility' },
      { key: 'experimental', label: 'settings-section-experimental', icon: 'icon-code-2' },
      { key: 'gdpr', label: 'settings-section-gdpr', icon: 'icon-shield-tick' },
    ]
  };

  activeSection = signal<string>('display');

  private dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private settingsService = inject(SettingsService);

  localSettings = signal<Settings>(this.settingsService.getSettingsCopy());

  save() {
    this.settingsService.settings = this.localSettings();
    this.dialogRef.close();
  }

  close() {
    this.dialogRef.close();
  }

  onSectionChange(section: string) {
    this.activeSection.set(section);
  }

}
