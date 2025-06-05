import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgClass} from '@angular/common';

@Component({
  selector: 'app-day-offset-picker',
  imports: [
    NgClass,
  ],
  templateUrl: './day-offset-picker.component.html',
  styleUrl: './day-offset-picker.component.scss'
})
export class DayOffsetPickerComponent {
  @Input() offset: number = 0;
  @Input() min: number = -365;
  @Input() max: number = 365;
  @Input() theme: 'light' | 'dark' = 'light';

  @Output() offsetChange = new EventEmitter<number>();

  stepUp(): void {
    if (this.offset < this.max) {
      this.offset++;
      this.offsetChange.emit(this.offset);
    }
  }

  stepDown(): void {
    if (this.offset > this.min) {
      this.offset--;
      this.offsetChange.emit(this.offset);
    }
  }

  formatOffset(value: number): string {
    if (value === 0) return '+0 den';
    const sign = value > 0 ? '+' : '';
    const abs = Math.abs(value);
    const plural =
      abs === 1 ? 'deň' :
        abs >= 2 && abs <= 4 ? 'dni' :
          'dní';
    return `${sign}${value} ${plural}`;
  }
}
