import {Component, EventEmitter, Input, OnChanges, Output, signal} from '@angular/core';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-radio-button',
  imports: [
    NgIf,
  ],
  templateUrl: './radio-button.component.html',
  styleUrl: './radio-button.component.scss'
})
export class RadioButtonComponent implements OnChanges {

  @Input() value: string = '';
  @Input() groupValue: string = '';
  @Output() groupValueChange = new EventEmitter<string>();

  isSelected = signal(false);

  ngOnChanges() {
    this.isSelected.set(this.value === this.groupValue);
  }

  select() {
    if (this.value !== this.groupValue) {
      this.groupValueChange.emit(this.value);
      this.isSelected.set(true);
    }
  }
}
