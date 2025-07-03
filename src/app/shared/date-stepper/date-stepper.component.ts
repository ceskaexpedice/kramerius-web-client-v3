import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {InputComponent} from '../components/input/input.component';
import {of} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {NgIf} from '@angular/common';
import {DateRange, RangeSliderComponent} from '../components/range-slider/range-slider.component';
import {ENVIRONMENT} from '../../app.config';

export interface DateStepperChange {
  dateFrom: Date;
  dateTo?: Date;
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

  offset: number = 0;

  dateFrom: Date = new Date();
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

    this.emitDate();
  }

  calculateDates() {
    if (this.dateMode() === DatePickerMode.Range && this.dateFrom) {
      this.dateTo = new Date(this.dateFrom);
      // add time 23:59:59 to dateTo
      this.dateTo.setHours(23, 59, 59, 999);
      this.dateTo.setDate(this.dateFrom.getDate() + this.offset);
    }

    if (this.dateMode() === DatePickerMode.Manual && this.dateTo) {
      this.offset = Math.floor((this.dateTo.getTime() - this.dateFrom.getTime()) / (1000 * 60 * 60 * 24));
    }
  }

  parseFromString(dateString: string): void {
    console.log('dateString:', dateString);

    const singleDatePattern = /^(\d{4})-(\d{2})-(\d{2})\+(-?\d+)$/;
    const rangePattern = /^\[([0-9T:\-\.Z]+)\s+TO\s+([0-9T:\-\.Z]+)\]$/;

    const singleMatch = dateString.match(singleDatePattern);
    const rangeMatch = dateString.match(rangePattern);

    if (singleMatch) {
      const [, yearStr, monthStr, dayStr, offsetStr] = singleMatch;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const offset = parseInt(offsetStr, 10);

      console.log('Parsed single date:', { year, month, day, offset });

      const isValid = !isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(offset);
      if (!isValid) {
        console.warn('Parsed values are invalid (single date):', { year, month, day, offset });
        return;
      }

      this.offset = offset;
      this.dateTo = undefined;
      this.dateFrom = new Date(Date.UTC(year, month - 1, day));

      this.dateMode.set(DatePickerMode.Manual);

      this.calculateDates();
      return;
    }

    if (rangeMatch) {
      const [, fromStr, toStr] = rangeMatch;

      const fromDate = new Date(fromStr);
      const toDate = new Date(toStr);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        console.warn('Invalid date range values:', { fromStr, toStr });
        return;
      }

      this.dateFrom = fromDate;
      this.dateTo = toDate;
      this.offset = 0;

      this.dateMode.set(DatePickerMode.Range);

      return;
    }

    console.warn('Invalid date string format:', dateString);
  }

  onManualPartChange(part: 'day' | 'month' | 'year', value: number | string) {
    const val = typeof value === 'string' ? parseInt(value, 10) : value;

    const year = this.getYear(this.dateFrom);
    const month = this.getMonth(this.dateFrom);
    const day = this.getDay(this.dateFrom);

    let newDate: Date;

    if (part === 'year') {
      newDate = new Date(Date.UTC(val, month - 1, day));
    } else if (part === 'month') {
      newDate = new Date(Date.UTC(year, val - 1, day));
    } else {
      newDate = new Date(Date.UTC(year, month - 1, val));
    }

    if (!isNaN(newDate.getTime())) {
      this.dateFrom = newDate;
      this.emitDate();
    }
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
    this.emitDate();
  }

  emitDate() {
    // Create a UTC date to avoid timezone issues
    // This will create a date object that represents the same calendar date
    // regardless of the user's timezone
    // create utc date from dateFrom
    const utcDate = new Date(Date.UTC(this.dateFrom.getFullYear(), this.dateFrom.getMonth(), this.dateFrom.getDate()));

    // date to is dateFrom + offset days
    let dateTo = new Date(utcDate);
    dateTo.setDate(utcDate.getDate() + this.offset);

    // set time to 23:59:59 for dateTo if it is not range
    dateTo.setHours(23, 59, 59, 999);

    // if type is range, dateTo is from dateTo variable
    if (this.dateMode() === DatePickerMode.Range && this.dateTo) {
      dateTo = this.dateTo;
    }

    console.log('dateTo:', dateTo);

    this.dateChange.emit({dateFrom : utcDate, dateTo, offset: this.dateMode() === DatePickerMode.Manual ? this.offset : -1});
  }

  getDay(date: Date): number {
    console.log('date:', date);
    return date.getDate();
  }

  getMonth(date: Date): number {
    return date.getMonth() + 1;
  }

  getYear(date: Date): number {
    console.log('getYear date:', date);
    console.log('year:', date.getFullYear());
    return date.getFullYear();
  }

  getMaxDay(date: Date): number {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    return new Date(year, month, 0).getDate();
  }

  protected readonly of = of;
  protected readonly DatePickerMode = DatePickerMode;
}
