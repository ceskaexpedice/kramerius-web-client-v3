import { Component, inject } from '@angular/core';
import {
  ToggleButtonGroupComponent, ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import { AppSettingsThemeEnum } from '../../settings.model';
import { AccessibilityService } from '../../../../shared/services/accessibility.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-settings-accessibility-section',
  imports: [
    ToggleButtonGroupComponent,
    MatSlideToggleModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './settings-accessibility-section.html',
  styleUrl: './settings-accessibility-section.scss',
})
export class SettingsAccessibilitySection {

  textSizeOptions: ToggleOption<number>[] = [];

  public accessibilityService = inject(AccessibilityService);

  ngOnInit() {
    this.generateToggleButtons();
  }

  generateToggleButtons() {
    this.textSizeOptions = [
      { label: '100 %', value: 100 },
      { label: '150 %', value: 150 },
      { label: '200 %', value: 200 },
      { label: '300 %', value: 300 }
    ];
  }

  onTextScaleChange(scale: number) {
    this.accessibilityService.setTextScale(scale as 100 | 125 | 150 | 200 | 300);
  }

  onDyslexiaFriendlyChange() {
    this.accessibilityService.toggleDyslexiaFriendly();
  }

}
