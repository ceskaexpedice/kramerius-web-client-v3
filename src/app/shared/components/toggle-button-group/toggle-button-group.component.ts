import { Component, Input, Output, EventEmitter } from '@angular/core';
import {NgClass, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {CdkTooltipDirective} from '../../directives/cdk-tooltip/cdk-tooltip.directive';

export interface ToggleOption<T> {
  icon?: string;
  iconColor?: string;
  label?: string;
  value: T;
  ariaLabel?: string;
}

@Component({
  selector: 'app-toggle-button-group',
  imports: [NgForOf, NgIf, TranslatePipe, NgClass, CdkTooltipDirective],
  templateUrl: './toggle-button-group.component.html',
  styleUrl: './toggle-button-group.component.scss'
})
export class ToggleButtonGroupComponent<T = any> {

  @Input() options: ToggleOption<T>[] = [];
  @Input() value!: T;
  @Input() showLabel = false;
  @Input() label = '';
  @Output() valueChange = new EventEmitter<T>();
  @Input() size: 'sm' | 'md' | 'lg' = 'sm';
  @Input() variant: 'default' | 'pill' = 'default';
  /** Accessible name for the whole group (translation key). */
  @Input() groupAriaLabel = '';

  select(option: ToggleOption<T>) {
    if (option.value !== this.value) this.valueChange.emit(option.value);
  }
}
