import {Component, Input, signal} from '@angular/core';
import {NgForOf, NgIf, NgSwitch, NgSwitchCase} from '@angular/common';
import {SettingsDisplaySectionComponent} from '../settings-display-section/settings-display-section.component';
import {
	SettingsExperimentalSectionComponent
} from '../settings-experimental-section/settings-experimental-section.component';
import {SettingsGdprSectionComponent} from '../settings-gdpr-section/settings-gdpr-section.component';
import {SettingsReadSectionComponent} from '../settings-read-section/settings-read-section.component';
import {
	SettingsUserPreferencesSectionComponent
} from '../settings-user-preferences-section/settings-user-preferences-section.component';
import {TranslatePipe} from '@ngx-translate/core';
import {FormsModule} from '@angular/forms';
import {Settings} from '../../settings.model';

@Component({
  selector: 'app-settings-content',
	imports: [
    FormsModule,
    NgForOf,
    TranslatePipe,
    NgSwitchCase,
    NgSwitch,
    SettingsDisplaySectionComponent,
    SettingsReadSectionComponent,
    SettingsUserPreferencesSectionComponent,
    SettingsExperimentalSectionComponent,
    SettingsGdprSectionComponent,
	],
  templateUrl: './settings-content.component.html',
  styleUrl: './settings-content.component.scss'
})
export class SettingsContentComponent {

  @Input() settings!: Settings;

  sections = [
    { key: 'display', label: 'settings-section-display', icon: 'icon-light-dark' },
    { key: 'reading', label: 'settings-section-reading', icon: 'icon-volume-high' },
    { key: 'preferences', label: 'settings-section-user-preferences', icon: 'icon-setting-4' },
    { key: 'experimental', label: 'settings-section-experimental', icon: 'icon-code' },
    { key: 'gdpr', label: 'settings-section-gdpr', icon: 'icon-shield-tick' },
  ];

  activeSection = signal<string>('display');

  setSection(key: string) {
    this.activeSection.set(key);
  }

}
