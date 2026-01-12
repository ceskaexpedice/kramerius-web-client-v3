import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {NgSwitch, NgSwitchCase} from '@angular/common';
import {SettingsDisplaySectionComponent} from '../settings-display-section/settings-display-section.component';
import {
	SettingsExperimentalSectionComponent
} from '../settings-experimental-section/settings-experimental-section.component';
import {SettingsGdprSectionComponent} from '../settings-gdpr-section/settings-gdpr-section.component';
import {SettingsReadSectionComponent} from '../settings-read-section/settings-read-section.component';
import {
	SettingsUserPreferencesSectionComponent
} from '../settings-user-preferences-section/settings-user-preferences-section.component';
import {FormsModule} from '@angular/forms';
import {Settings} from '../../settings.model';
import {SettingsAccessibilitySection} from '../settings-accessibility-section/settings-accessibility-section';

@Component({
  selector: 'app-settings-content',
  imports: [
    FormsModule,
    NgSwitchCase,
    NgSwitch,
    SettingsDisplaySectionComponent,
    SettingsReadSectionComponent,
    SettingsUserPreferencesSectionComponent,
    SettingsExperimentalSectionComponent,
    SettingsGdprSectionComponent,
    SettingsAccessibilitySection,
  ],
  templateUrl: './settings-content.component.html',
  styleUrl: './settings-content.component.scss'
})
export class SettingsContentComponent {

  @Input() settings!: Settings;
  @Input() activeSection = signal<string>('display');
  @Output() settingsChange = new EventEmitter<Settings>();

}
