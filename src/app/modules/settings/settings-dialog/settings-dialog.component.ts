import { Component, inject, signal } from '@angular/core';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {
  SettingsDisplaySectionComponent
} from '../components/settings-display-section/settings-display-section.component';
import {SettingsReadSectionComponent} from '../components/settings-read-section/settings-read-section.component';
import {
  SettingsUserPreferencesSectionComponent
} from '../components/settings-user-preferences-section/settings-user-preferences-section.component';
import {
  SettingsExperimentalSectionComponent
} from '../components/settings-experimental-section/settings-experimental-section.component';
import {SettingsGdprSectionComponent} from '../components/settings-gdpr-section/settings-gdpr-section.component';
import {SettingsContentComponent} from '../components/settings-content/settings-content.component';

@Component({
  selector: 'app-settings-dialog',
  imports: [
    FormsModule,
    TranslatePipe,
    SettingsContentComponent,
  ],
  templateUrl: './settings-dialog.component.html',
  styleUrl: './settings-dialog.component.scss'
})
export class SettingsDialogComponent {

  private dialogRef = inject(MatDialogRef<SettingsDialogComponent>);

  save() {
    console.log('Ukladám...', {
    });
  }

  close() {
    this.dialogRef.close();
  }

}
