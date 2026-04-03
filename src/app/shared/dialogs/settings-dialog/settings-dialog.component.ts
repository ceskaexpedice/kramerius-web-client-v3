import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { SettingsContentComponent } from '../../../modules/settings/components/settings-content/settings-content.component';
import { SettingsService } from '../../../modules/settings/settings.service';
import { Settings } from '../../../modules/settings/settings.model';
import {
  DialogConfig,
  SidebarDialogLayoutComponent,
} from '../sidebar-dialog-layout/sidebar-dialog-layout.component';
import { AuthService } from '../../../core/auth/auth.service';

export interface SettingsDialogData {
  initialSection?: string;
  expandMoreInfo?: boolean;
}

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
export class SettingsDialogComponent implements OnInit {

  private authService = inject(AuthService);
  private dialogRef = inject(MatDialogRef<SettingsDialogComponent>);
  private settingsService = inject(SettingsService);
  private dialogData = inject<SettingsDialogData | null>(MAT_DIALOG_DATA, { optional: true });

  dialogConfig: DialogConfig = {
    title: 'settings',
    showSaveButton: true,
    showCancelButton: true,
    sections: [
      { key: 'display', label: 'settings-section-display', icon: 'icon-light-dark' },
      ...(this.authService.hasValidToken() ? [{ key: 'account', label: 'settings-section-account', icon: 'icon-user-square' }] : []),
      { key: 'reading', label: 'settings-section-reading', icon: 'icon-volume-high' },
      // { key: 'preferences', label: 'settings-section-user-preferences', icon: 'icon-settings-4' },
      { key: 'accessibility', label: 'settings-section-accessibility', icon: 'icon-accesibility' },
      { key: 'experimental', label: 'settings-section-experimental', icon: 'icon-code-2' },
      { key: 'gdpr', label: 'settings-section-gdpr', icon: 'icon-shield-tick' },
    ]
  };

  activeSection = signal<string>('display');
  expandAccountMoreInfo = false;

  localSettings = signal<Settings>(this.settingsService.getSettingsCopy());

  ngOnInit(): void {
    // Set initial section from dialog data if provided
    if (this.dialogData?.initialSection) {
      const sectionKeys = this.dialogConfig.sections.map(s => s.key);
      if (sectionKeys.includes(this.dialogData.initialSection)) {
        this.activeSection.set(this.dialogData.initialSection);
      }
    }

    // Set expand more info from dialog data if provided
    if (this.dialogData?.expandMoreInfo) {
      this.expandAccountMoreInfo = true;
    }
  }

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
    this.settingsService.updateSettingsSection(section);
  }

  onSettingsChange(settings: Settings) {
    this.localSettings.set(settings);
  }

  onMoreInfoToggle(expanded: boolean) {
    this.settingsService.updateMoreInfo(expanded);
  }

}
