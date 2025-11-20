import {Component, inject, Input, OnInit} from '@angular/core';
import {AppSettingsThemeEnum, Settings} from '../../settings.model';
import {
  ToggleButtonGroupComponent, ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import {SettingsService} from '../../settings.service';
import {AccessibilityService} from '../../../../shared/services/accessibility.service';

@Component({
  selector: 'app-settings-display-section',
  imports: [
    ToggleButtonGroupComponent,
  ],
  templateUrl: './settings-display-section.component.html',
  styleUrl: './settings-display-section.component.scss'
})
export class SettingsDisplaySectionComponent implements OnInit {
  @Input() settings!: Settings;

  options: ToggleOption<AppSettingsThemeEnum>[] = [];
  textSizeOptions: ToggleOption<number>[] = [];

  private settingsService = inject(SettingsService);
  public accessibilityService = inject(AccessibilityService);

  ngOnInit() {
    this.generateToggleButtons();
  }

  generateToggleButtons() {
    this.options = [
      { label: 'display-light-mode', value: AppSettingsThemeEnum.LIGHT, icon: 'icon-sun', iconColor: '--icon-sun-color' },
      { label: 'display-dark-mode', value: AppSettingsThemeEnum.DARK, icon: 'icon-moon', iconColor: '--icon-moon-color' },
      { label: 'display-system-mode', value: AppSettingsThemeEnum.SYSTEM, icon: 'icon-monitor' },
    ];

    this.textSizeOptions = [
      { label: 'text-size-small', value: 100, icon: 'icon-align-left' },
      { label: 'text-size-medium', value: 125, icon: 'icon-align-center' },
      { label: 'text-size-large', value: 150, icon: 'icon-align-right' }
    ];
  }

  onThemeChange(newTheme: AppSettingsThemeEnum) {
    this.settings.theme = newTheme;
    this.settingsService.settings = this.settings;
  }

  onTextScaleChange(scale: number) {
    this.accessibilityService.setTextScale(scale as 100 | 125 | 150);
  }

}
