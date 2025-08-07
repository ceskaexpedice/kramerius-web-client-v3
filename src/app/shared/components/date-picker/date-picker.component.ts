import {Component, EventEmitter, Input, OnInit, Output, signal} from '@angular/core';
import {InputDateComponent} from '../input-date/input-date.component';
import {DateRange} from '../range-slider/range-slider.component';

export interface DatePickerOutput {
  dateFrom: Date;
  offset: number;
  dateTo: Date;
}

@Component({
  selector: 'app-date-picker',
  imports: [
    InputDateComponent,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements OnInit {

  @Input() initialDateFrom: Date | null = null;
  @Input() initialDateTo: Date | null = null;
  @Input() initialOffset: number = 0;

  openedMore: boolean = false;

  minDate: Date = new Date(1900, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  fromDate = signal<Date | undefined>(undefined);
  toDate = signal<Date | undefined>(undefined);
  offset = signal<number>(0);

  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() datePickerChange = new EventEmitter<DatePickerOutput>();

  ngOnInit() {
    // Initialize with provided values if available
    if (this.initialDateFrom) {
      this.fromDate.set(this.initialDateFrom);
    }
    if (this.initialDateTo) {
      this.toDate.set(this.initialDateTo);
    }
    if (this.initialOffset !== undefined) {
      this.offset.set(this.initialOffset);

      if (this.initialOffset > 7) {
        this.openedMore = true;
      }
    }
  }


  onFromDateInput(date: Date) {
    if (!this.minDate || !this.maxDate) return;

    // Clamp date to valid range
    const clampedDate = new Date(Math.max(
      this.minDate.getTime(),
      Math.min(this.maxDate.getTime(), date.getTime())
    ));

    this.fromDate.set(clampedDate);

    // Calculate toDate based on current offset
    const calculatedToDate = new Date(clampedDate.getTime() + this.offset() * 24 * 60 * 60 * 1000);
    this.toDate.set(calculatedToDate);

    this.emitChanges();
  }

  onToDateInput(date: Date) {
    if (!this.minDate || !this.maxDate) return;

    // Clamp date to valid range
    const clampedDate = new Date(Math.max(
      this.minDate.getTime(),
      Math.min(this.maxDate.getTime(), date.getTime())
    ));

    this.toDate.set(clampedDate);

    // Calculate offset based on date difference
    if (this.fromDate()) {
      const diffTime = clampedDate.getTime() - this.fromDate()!.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      this.offset.set(Math.max(0, diffDays));
    }

    this.emitChanges();
  }

  onOffsetClick(days: number) {
    this.offset.set(days);

    if (this.fromDate()) {
      const calculatedToDate = new Date(this.fromDate()!.getTime() + days * 24 * 60 * 60 * 1000);
      this.toDate.set(calculatedToDate);
    }

    this.emitChanges();
  }

  private emitChanges() {
    const fromDate = this.fromDate();
    const toDate = this.toDate();
    const offset = this.offset();

    if (fromDate && toDate) {
      this.dateRangeChange.emit({ from: fromDate, to: toDate });
      this.datePickerChange.emit({ dateFrom: fromDate, offset, dateTo: toDate });
    }
  }
}
