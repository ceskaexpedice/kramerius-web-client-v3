import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';

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

  private translate = inject(TranslateService);

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
    const abs = Math.abs(value);
    const sign = value > 0 ? '+' : ''; // Keep sign logic even for 0 if desired, though original had specific return for 0
    if (value === 0) {
      return `+0 ${this.translate.instant('day-plural-many')}`;
    }

    let key = 'day-plural-many';
    if (abs === 1) {
      key = 'day-singular';
    } else if (abs >= 2 && abs <= 4) {
      key = 'day-plural-few';
    }

    const dayString = this.translate.instant(key);
    return `${sign}${value} ${dayString}`;
  }
}
