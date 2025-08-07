import {Component, EventEmitter, Output, signal} from '@angular/core';
import {InputDateComponent} from '../input-date/input-date.component';
import {DatePickerMode, DateStepperComponent} from '../../date-stepper/date-stepper.component';
import {InputComponent} from '../input/input.component';
import {NgIf} from '@angular/common';
import {DateRange} from '../range-slider/range-slider.component';

@Component({
  selector: 'app-date-picker',
  imports: [
    InputDateComponent,
    DateStepperComponent,
    InputComponent,
    NgIf,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent {

  openedMore: boolean = false;

  minDate: Date = new Date(1900, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  fromDate = signal<Date | undefined>(undefined);
  toDate = signal<Date | undefined>(undefined);

  @Output() dateRangeChange = new EventEmitter<DateRange>();

  protected readonly DatePickerMode = DatePickerMode;

  onFromDateInput(date: Date) {
    if (!this.minDate || !this.maxDate) return;

    // Clamp date to valid range
    const clampedDate = new Date(Math.max(
      this.minDate.getTime(),
      Math.min(this.maxDate.getTime(), date.getTime())
    ));

    this.fromDate.set(clampedDate);

    console.log('fromDate set to:', clampedDate);

    this.dateRangeChange.emit(
      {
        from: this.fromDate() || this.minDate,
        to: this.toDate() || this.maxDate
      }
    )
  }
}
