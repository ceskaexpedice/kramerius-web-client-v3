import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {InputComponent} from '../components/input/input.component';
import {of} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {NgIf} from '@angular/common';
import {DateRange, RangeSliderComponent} from '../components/range-slider/range-slider.component';
import {ENVIRONMENT} from '../../app.config';

export interface DateStepperChange {
  date: Date;
  offset: number;
}

export enum DatePickerMode {
  Manual = 'manual',
  Range = 'range',
}

@Component({
  selector: 'app-date-stepper',
  imports: [
    InputComponent,
    MatSlideToggle,
    NgIf,
    RangeSliderComponent,
  ],
  templateUrl: './date-stepper.component.html',
  styleUrl: './date-stepper.component.scss'
})
export class DateStepperComponent {

  dateMode = signal<DatePickerMode>(DatePickerMode.Manual);

  @Input() data: any = {};
  @Input() showModeToggle: boolean = false;

  @Output() dateChange = new EventEmitter<DateStepperChange>();

  day: number = 1;
  month: number = 1;
  year: number = 1970;
  offset: number = 0;

  dateFrom: Date | undefined = undefined;
  dateTo: Date | undefined = undefined;
  minDate: Date = new Date(1900, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  ngOnInit() {
    this.calculateMinMaxDates();

    this.parseFromString(this.data);

    this.emitDate();
  }

  calculateMinMaxDates() {
    // max date is today
    const today = new Date();
    this.maxDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const minYear = ENVIRONMENT.dateRangeStartYear;
    // min date is 1.1.minYear
    this.minDate = new Date(minYear, 0, 1);
  }

  toggleDateMode() {
    this.dateMode.update((currentMode) => {
      return currentMode === DatePickerMode.Manual ? DatePickerMode.Range : DatePickerMode.Manual;
    });

    this.calculateDates();
  }

  calculateDates() {
    // dateFrom is from day,month,year
    this.dateFrom = new Date(Date.UTC(this.year, this.month - 1, this.day));
    // dateTo is dateFrom + offset days
    this.dateTo = new Date(this.dateFrom);
    this.dateTo.setDate(this.dateFrom.getDate() + this.offset);
  }

  parseFromString(dateString: string): void {
    console.log('dateString:', dateString);
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

    this.calculateDates();
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

  dateRangeChange(range: DateRange) {
    this.dateFrom = range.from;
    this.dateTo = range.to;
    console.log('dateRangeChange:', range);
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

    // Create a UTC date to avoid timezone issues
    // This will create a date object that represents the same calendar date
    // regardless of the user's timezone
    const utcDate = new Date(Date.UTC(this.year, this.month - 1, this.day));

    this.dateChange.emit({date : utcDate, offset: this.offset});
  }

  protected readonly of = of;
  protected readonly DatePickerMode = DatePickerMode;
}
