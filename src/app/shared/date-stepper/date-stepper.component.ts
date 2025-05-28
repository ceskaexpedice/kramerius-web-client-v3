import {Component, EventEmitter, Input, Output} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';
import {InputComponent} from '../components/input/input.component';
import {DayOffsetPickerComponent} from '../day-offset-picker/day-offset-picker.component';
import {of} from 'rxjs';

@Component({
  selector: 'app-date-stepper',
  imports: [
    NgForOf,
    NgIf,
    InputComponent,
    DayOffsetPickerComponent,
  ],
  templateUrl: './date-stepper.component.html',
  styleUrl: './date-stepper.component.scss'
})
export class DateStepperComponent {
  @Input() initialDate: Date = new Date();
  @Input() initialOffset: number = 0;

  @Output() dateChange = new EventEmitter<Date>();

  day: number = 1;
  month: number = 1;
  year: number = 1970;
  offset: number = 0;

  ngOnInit() {
    this.setFromDate(this.initialDate, this.initialOffset);
  }

  setFromDate(date: Date, offset: number = 0) {
    this.day = date.getDate();
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();
    this.offset = offset;
    this.emitDate();
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
    result.setDate(result.getDate() + this.offset);

    this.dateChange.emit(result);
  }

  protected readonly of = of;
}
