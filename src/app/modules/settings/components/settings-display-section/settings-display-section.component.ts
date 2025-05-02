import {Component, inject, OnInit} from '@angular/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {TranslatePipe} from '@ngx-translate/core';
import {SettingsService} from '../../settings.service';
import {AppSettingsThemeEnum} from '../../settings.model';
import {
  ToggleButtonGroupComponent, ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';

@Component({
  selector: 'app-settings-display-section',
  imports: [
    MatCheckbox,
    TranslatePipe,
    ToggleButtonGroupComponent,
  ],
  templateUrl: './settings-display-section.component.html',
  styleUrl: './settings-display-section.component.scss'
})
export class SettingsDisplaySectionComponent implements OnInit {

  options: ToggleOption<AppSettingsThemeEnum>[] = [];

  public settings = inject(SettingsService);

  protected readonly AppSettingsThemeEnum = AppSettingsThemeEnum;

  ngOnInit() {
    this.generateToggleButtons();
  }

  generateToggleButtons() {
    this.options = [
      { label: 'Svetlý režim', value: AppSettingsThemeEnum.LIGHT },
      { label: 'Tmavý režim', value: AppSettingsThemeEnum.DARK },
      { label: 'Systémový', value: AppSettingsThemeEnum.SYSTEM },
    ];
  }

  onThemeChange(newTheme: AppSettingsThemeEnum) {
    this.settings.theme = newTheme;
  }

}
