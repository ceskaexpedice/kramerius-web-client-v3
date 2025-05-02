import {Component, Input, OnInit} from '@angular/core';
import {AppSettingsThemeEnum, Settings} from '../../settings.model';
import {
  ToggleButtonGroupComponent, ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';

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

  ngOnInit() {
    this.generateToggleButtons();
  }

  generateToggleButtons() {
    this.options = [
      { label: 'Svetlý režim', value: AppSettingsThemeEnum.LIGHT, icon: 'icon-sun', iconColor: '--icon-sun-color' },
      { label: 'Tmavý režim', value: AppSettingsThemeEnum.DARK, icon: 'icon-moon', iconColor: '--icon-moon-color' },
      { label: 'Systémový', value: AppSettingsThemeEnum.SYSTEM, icon: 'icon-monitor' },
    ];
  }

  onThemeChange(newTheme: AppSettingsThemeEnum) {
    this.settings.theme = newTheme;
  }

}
