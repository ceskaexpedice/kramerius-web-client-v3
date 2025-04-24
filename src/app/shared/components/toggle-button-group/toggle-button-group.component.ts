import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgForOf } from '@angular/common';

export interface ToggleOption<T> {
  label: string;
  value: T;
}

@Component({
  selector: 'app-toggle-button-group',
  imports: [NgForOf],
  templateUrl: './toggle-button-group.component.html',
  styleUrl: './toggle-button-group.component.scss'
})
export class ToggleButtonGroupComponent<T = any> {
  @Input() options: ToggleOption<T>[] = [];
  @Input() value!: T;
  @Output() valueChange = new EventEmitter<T>();

  select(option: ToggleOption<T>) {
    if (option.value !== this.value) this.valueChange.emit(option.value);
  }
}
