import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { SettingsDisplaySectionComponent } from '../settings-display-section/settings-display-section.component';
import { SettingsReadSectionComponent } from '../settings-read-section/settings-read-section.component';
import { FormsModule } from '@angular/forms';
import { Settings } from '../../settings.model';
import { SettingsAccessibilitySection } from '../settings-accessibility-section/settings-accessibility-section';
import { SettingsAccountSectionComponent } from '../settings-account-section/settings-account-section.component';

@Component({
  selector: 'app-settings-content',
  imports: [
    FormsModule,
    SettingsDisplaySectionComponent,
    SettingsReadSectionComponent,
    SettingsAccessibilitySection,
    SettingsAccountSectionComponent
  ],
  templateUrl: './settings-content.component.html',
  styleUrl: './settings-content.component.scss'
})
export class SettingsContentComponent {

  @Input() settings!: Settings;
  @Input() activeSection = signal<string>('display');
  @Input() expandAccountMoreInfo = false;
  @Output() settingsChange = new EventEmitter<Settings>();
  @Output() moreInfoToggle = new EventEmitter<boolean>();

}
