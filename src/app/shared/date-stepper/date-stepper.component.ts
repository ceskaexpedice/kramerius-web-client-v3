import {Component, EventEmitter, Input, Output} from '@angular/core';
import {InputComponent} from '../components/input/input.component';
import {DayOffsetPickerComponent} from '../day-offset-picker/day-offset-picker.component';
import {of} from 'rxjs';

export interface DateStepperChange {
  date: Date;
  offset: number;
}

@Component({
  selector: 'app-date-stepper',
  imports: [
    InputComponent,
    DayOffsetPickerComponent,
  ],
  templateUrl: './date-stepper.component.html',
  styleUrl: './date-stepper.component.scss'
})
export class DateStepperComponent {
  @Input() data: any = {};

  @Output() dateChange = new EventEmitter<DateStepperChange>();

  day: number = 1;
  month: number = 1;
  year: number = 1970;
  offset: number = 0;

  ngOnInit() {
    this.parseFromString(this.data);

    this.emitDate();
  }

  parseFromString(dateString: string): void {
    const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})\+(-?\d+)$/);

    if (!match) {
      console.warn('Invalid date string format:', dateString);
      return;
    }

    const [, yearStr, monthStr, dayStr, offsetStr] = match;

    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const offset = parseInt(offsetStr, 10);

    const isValidDate = !isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(offset);

    if (!isValidDate) {
      console.warn('Parsed values are invalid:', { year, month, day, offset });
      return;
    }

    this.year = year;
    this.month = month;
    this.day = day;
    this.offset = offset;
  }

  getMaxDay(): number {
    return new Date(this.year, this.month, 0).getDate();
  }

  onPartChange(part: 'day' | 'month' | 'year', value: number | string) {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    if (part === 'day') this.day = numValue;
    if (part === 'month') this.month = numValue;
    if (part === 'year') this.year = numValue;
    this.emitDate();
  }

  onOffsetChange(value: number | string) {
    const numValue = typeof value === 'string' ? parseInt(value, 10) : value;
    this.offset = numValue;
    this.emitDate();
  }

  emitDate() {
    const baseDate = new Date(this.year, this.month - 1, this.day);

    const isValid =
      baseDate.getFullYear() === this.year &&
      baseDate.getMonth() === this.month - 1 &&
      baseDate.getDate() === this.day;

    // if (!isValid) {
    //   console.warn('Neplatný dátum:', { day: this.day, month: this.month, year: this.year });
    //   return;
    // }

    const result = new Date(baseDate);
    result.setDate(result.getDate());

    this.dateChange.emit({date : result, offset: this.offset});
  }

  protected readonly of = of;
}
