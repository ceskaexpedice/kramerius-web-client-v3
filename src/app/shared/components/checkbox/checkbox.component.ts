import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-checkbox',
  imports: [
    NgIf,
  ],
  templateUrl: './checkbox.component.html',
  styleUrl: './checkbox.component.scss'
})
export class CheckboxComponent {
  checked = signal(false);

  @Input() set model(value: boolean) {
    this.checked.set(value);
  }

  @Output() modelChange = new EventEmitter<boolean>();

  toggle() {
    this.checked.update((prev: boolean) => {
      const newValue = !prev;
      this.modelChange.emit(newValue);
      return newValue;
    });
  }
}
