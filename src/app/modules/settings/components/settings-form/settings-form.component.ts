import {Component, inject} from '@angular/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {TranslatePipe} from '@ngx-translate/core';
import {SettingsService} from '../../settings.service';
import {AppSettingsThemeEnum} from '../../settings.model';

@Component({
  selector: 'app-settings-form',
  imports: [
    MatCheckbox,
    TranslatePipe,
  ],
  templateUrl: './settings-form.component.html',
  styleUrl: './settings-form.component.scss'
})
export class SettingsFormComponent {

  public settings = inject(SettingsService);

  protected readonly AppSettingsThemeEnum = AppSettingsThemeEnum;
}
