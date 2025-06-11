// import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
// import { NgClass, NgIf } from '@angular/common';
// import { InputComponent } from '../input/input.component';
//
// @Component({
//   selector: 'app-range-slider',
//   standalone: true,
//   imports: [NgIf, NgClass, InputComponent],
//   templateUrl: './range-slider.component.html',
//   styleUrl: './range-slider.component.scss',
// })
// export class RangeSliderComponent {
//   lastMoved: 'from' | 'to' = 'from';
//
//   @Input() min = 0;
//   @Input() max = 100;
//   @Input() step = 1;
//
//   @Input() initialFrom = 0;
//   @Input() initialTo = 100;
//
//   @Input() layout: 'default' | 'inline' = 'default';
//
//   @Output() rangeChange = new EventEmitter<{ from: number; to: number }>();
//
//   from = signal(this.initialFrom);
//   to = signal(this.initialTo);
//
//   ngOnInit() {
//     this.from.set(this.initialFrom);
//     this.to.set(this.initialTo);
//
//     this.emitChange();
//   }
//
//   onFromInput(value: number | string) {
//     const parsedValue = Number.parseInt(value.toString(), 10);
//
//     // if (parsedValue > this.to()) {
//     //   this.to.set(parsedValue);
//     // }
//
//     const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
//     this.from.set(clamped);
//     this.lastMoved = 'from';
//     this.emitChange();
//   }
//
//   onToInput(value: number | string) {
//     const parsedValue = Number.parseInt(value.toString(), 10);
//
//     // if (parsedValue < this.from()) {
//     //   this.from.set(parsedValue);
//     // }
//
//     const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
//     this.to.set(clamped);
//     this.lastMoved = 'to';
//     this.emitChange();
//   }
//
//   emitChange() {
//     this.rangeChange.emit({ from: this.from(), to: this.to() });
//   }
//
//   getSliderBackground(): string {
//     const min = this.min;
//     const max = this.max;
//     const from = this.from();
//     const to = this.to();
//     const range = max - min;
//     const fromPercent = ((from - min) / range) * 100;
//     const toPercent = ((to - min) / range) * 100;
//
//     return `linear-gradient(
//       to right,
//       var(--color-bg-light) 0%,
//       var(--color-bg-light) ${fromPercent}%,
//       var(--color-primary) ${fromPercent}%,
//       var(--color-primary) ${toPercent}%,
//       var(--color-bg-light) ${toPercent}%,
//       var(--color-bg-light) 100%
//     )`;
//   }
//
//   protected readonly Number = Number;
// }

import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import {DatePipe, NgClass, NgIf} from '@angular/common';
import { InputComponent } from '../input/input.component';
import {InputDateComponent} from '../input-date/input-date.component';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface NumberRange {
  from: number;
  to: number;
}

@Component({
  selector: 'app-range-slider',
  standalone: true,
  imports: [NgIf, NgClass, InputComponent, DatePipe, InputDateComponent],
  templateUrl: './range-slider.component.html',
  styleUrl: './range-slider.component.scss',
})
export class RangeSliderComponent {
  lastMoved: 'from' | 'to' = 'from';

  // Numeric range inputs
  @Input() min = 0;
  @Input() max = 100;
  @Input() step = 1;
  @Input() initialFrom = 0;
  @Input() initialTo = 100;

  // Date range inputs
  @Input() type: 'number' | 'date' = 'number';
  @Input() minDate?: Date;
  @Input() maxDate?: Date;
  @Input() initialFromDate?: Date;
  @Input() initialToDate?: Date;
  @Input() dateFormat: string = 'DD. MM. YYYY'; // Format for display

  @Input() layout: 'default' | 'inline' = 'default';

  @Output() rangeChange = new EventEmitter<NumberRange>();
  @Output() dateRangeChange = new EventEmitter<DateRange>();

  from = signal(this.initialFrom);
  to = signal(this.initialTo);
  fromDate = signal<Date | undefined>(undefined);
  toDate = signal<Date | undefined>(undefined);

  // Internal values for date slider (days since minDate)
  private dateSliderMin = 0;
  private dateSliderMax = 365; // Default to 1 year range

  ngOnInit() {
    if (this.type === 'date') {
      this.initializeDateMode();
    } else {
      this.initializeNumberMode();
    }
  }

  private initializeNumberMode() {
    this.from.set(this.initialFrom);
    this.to.set(this.initialTo);
    this.emitChange();
  }

  private initializeDateMode() {
    // Set default dates if not provided
    if (!this.minDate) {
      this.minDate = new Date();
      this.minDate.setFullYear(this.minDate.getFullYear() - 1);
    }
    if (!this.maxDate) {
      this.maxDate = new Date();
      this.maxDate.setFullYear(this.maxDate.getFullYear() + 1);
    }
    if (!this.initialFromDate) {
      this.initialFromDate = new Date(this.minDate);
    }
    if (!this.initialToDate) {
      this.initialToDate = new Date(this.maxDate);
    }

    // Calculate slider range in days
    this.dateSliderMin = 0;
    this.dateSliderMax = this.dateDifferenceInDays(this.minDate, this.maxDate);

    // Set initial date values
    this.fromDate.set(this.initialFromDate);
    this.toDate.set(this.initialToDate);

    // Convert dates to slider values
    this.from.set(this.dateToSliderValue(this.initialFromDate));
    this.to.set(this.dateToSliderValue(this.initialToDate));

    this.emitDateChange();
  }

  private dateDifferenceInDays(date1: Date, date2: Date): number {
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private dateToSliderValue(date: Date): number {
    if (!this.minDate) return 0;
    return this.dateDifferenceInDays(this.minDate, date);
  }

  private sliderValueToDate(value: number): Date {
    if (!this.minDate) return new Date();
    const result = new Date(this.minDate);
    result.setDate(result.getDate() + value);
    return result;
  }

  private formatDate(date: Date): string {
    // Simple format implementation - you can enhance this or use a date library
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();

    return this.dateFormat
      .replace('DD', day)
      .replace('MM', month)
      .replace('YYYY', year.toString())
      .replace('YY', year.toString().slice(-2));
  }

  onFromInput(value: number | string | Date) {
    if (this.type === 'date' && value instanceof Date) {
      this.onFromDateInput(value);
    } else {
      this.onFromNumberInput(value as number | string);
    }
  }

  onToInput(value: number | string | Date) {
    if (this.type === 'date' && value instanceof Date) {
      this.onToDateInput(value);
    } else {
      this.onToNumberInput(value as number | string);
    }
  }

  private onFromNumberInput(value: number | string) {
    const parsedValue = Number.parseInt(value.toString(), 10);
    const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
    this.from.set(clamped);
    this.lastMoved = 'from';
    this.emitChange();
  }

  private onToNumberInput(value: number | string) {
    const parsedValue = Number.parseInt(value.toString(), 10);
    const clamped = Math.min(Math.max(this.min, parsedValue), this.max);
    this.to.set(clamped);
    this.lastMoved = 'to';
    this.emitChange();
  }

  private onFromDateInput(date: Date) {
    if (!this.minDate || !this.maxDate) return;

    // Clamp date to valid range
    const clampedDate = new Date(Math.max(
      this.minDate.getTime(),
      Math.min(this.maxDate.getTime(), date.getTime())
    ));

    this.fromDate.set(clampedDate);
    this.from.set(this.dateToSliderValue(clampedDate));
    this.lastMoved = 'from';
    this.emitDateChange();
  }

  private onToDateInput(date: Date) {
    if (!this.minDate || !this.maxDate) return;

    // Clamp date to valid range
    const clampedDate = new Date(Math.max(
      this.minDate.getTime(),
      Math.min(this.maxDate.getTime(), date.getTime())
    ));

    this.toDate.set(clampedDate);
    this.to.set(this.dateToSliderValue(clampedDate));
    this.lastMoved = 'to';
    this.emitDateChange();
  }

  onSliderFromChange(value: number) {
    if (this.type === 'date') {
      const newDate = this.sliderValueToDate(value);
      this.fromDate.set(newDate);
      this.from.set(value);
      this.lastMoved = 'from';
      this.emitDateChange();
    } else {
      this.from.set(value);
      this.lastMoved = 'from';
      this.emitChange();
    }
  }

  onSliderToChange(value: number) {
    if (this.type === 'date') {
      const newDate = this.sliderValueToDate(value);
      this.toDate.set(newDate);
      this.to.set(value);
      this.lastMoved = 'to';
      this.emitDateChange();
    } else {
      this.to.set(value);
      this.lastMoved = 'to';
      this.emitChange();
    }
  }

  emitChange() {
    if (this.type === 'number') {
      this.rangeChange.emit({ from: this.from(), to: this.to() });
    }
  }

  emitDateChange() {
    if (this.type === 'date' && this.fromDate() && this.toDate()) {
      this.dateRangeChange.emit({
        from: this.fromDate()!,
        to: this.toDate()!
      });
    }
  }

  getSliderBackground(): string {
    const min = this.type === 'date' ? this.dateSliderMin : this.min;
    const max = this.type === 'date' ? this.dateSliderMax : this.max;
    const from = this.from();
    const to = this.to();
    const range = max - min;
    const fromPercent = ((from - min) / range) * 100;
    const toPercent = ((to - min) / range) * 100;

    return `linear-gradient(
      to right,
      var(--color-bg-light) 0%,
      var(--color-bg-light) ${fromPercent}%,
      var(--color-primary) ${fromPercent}%,
      var(--color-primary) ${toPercent}%,
      var(--color-bg-light) ${toPercent}%,
      var(--color-bg-light) 100%
    )`;
  }

  getSliderMin(): number {
    return this.type === 'date' ? this.dateSliderMin : this.min;
  }

  getSliderMax(): number {
    return this.type === 'date' ? this.dateSliderMax : this.max;
  }

  getSliderStep(): number {
    return this.type === 'date' ? 1 : this.step;
  }

  getDisplayValue(type: 'from' | 'to'): string | number {
    if (this.type === 'date') {
      const date = type === 'from' ? this.fromDate() : this.toDate();
      return date ? this.formatDate(date) : '';
    }
    return type === 'from' ? this.from() : this.to();
  }

  onFromDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const dateValue = target.value;
    if (dateValue) {
      // Vytvoríme Date objekt z string hodnoty
      const newDate = new Date(dateValue);
      this.onFromInput(newDate);
    }
  }

  onToDateChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const dateValue = target.value;
    if (dateValue) {
      // Vytvoríme Date objekt z string hodnoty
      const newDate = new Date(dateValue);
      this.onToInput(newDate);
    }
  }

  protected readonly Number = Number;
  protected readonly Date = Date;
}
