import {
  ChangeDetectorRef,
  Component,
  EventEmitter, inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import {InputDateComponent} from '../input-date/input-date.component';
import {DateRange} from '../range-slider/range-slider.component';
import {TranslatePipe} from '@ngx-translate/core';
import {LowerCasePipe, NgIf} from '@angular/common';
import {MatCalendar} from '@angular/material/datepicker';
import {InputComponent} from '../input/input.component';
import {MonthYearChange, MonthYearSelectorComponent} from '../month-year-selector/month-year-selector.component';
import {MatCheckbox} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';

export interface DatePickerOutput {
  dateFrom: Date;
  offset: number;
  dateTo: Date;
}

@Component({
  selector: 'app-date-picker',
  imports: [
    InputDateComponent,
    TranslatePipe,
    LowerCasePipe,
    NgIf,
    MatCalendar,
    InputComponent,
    MonthYearSelectorComponent,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements OnInit, OnChanges {

  openedPopupCalendar: boolean = false;

  isRangeModeActive = false;

  monthFrom = signal(0);
  yearFrom = signal(2024);
  dateFrom = signal(new Date());

  monthTo = signal(0);
  yearTo = signal(2024);
  dateTo = signal(new Date());

  @ViewChild(MatCalendar) calendarFrom!: MatCalendar<Date>;


  @Input() initialDateFrom: Date | null = null;
  @Input() initialDateTo: Date | null = null;
  @Input() initialOffset: number = 0;

  openedMore: boolean = false;

  minDate: Date = new Date(1400, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  fromDate = signal<Date | undefined>(undefined);
  toDate = signal<Date | undefined>(undefined);
  offset = signal<number>(0);

  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() datePickerChange = new EventEmitter<DatePickerOutput>();

  private cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.updateFromInitialValues();
  }

  ngOnChanges(changes: SimpleChanges) {
    // React to changes in input properties
    if (changes['initialDateFrom'] || changes['initialDateTo'] || changes['initialOffset']) {
      this.updateFromInitialValues();
    }
  }

  toggleOpenPopupCalendar() {
    this.openedPopupCalendar = !this.openedPopupCalendar;
  }

  private updateFromInitialValues() {
    // Initialize with provided values if available
    if (this.initialDateFrom) {
      this.fromDate.set(this.initialDateFrom);
    } else {
      this.fromDate.set(undefined);
    }

    if (this.initialDateTo) {
      this.toDate.set(this.initialDateTo);
    } else {
      this.toDate.set(undefined);
    }

    if (this.initialOffset !== undefined) {
      this.offset.set(this.initialOffset);

      if (this.initialOffset > 7) {
        this.openedMore = true;
      }
    } else {
      this.offset.set(0);
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

  toggleOpenedMore() {
    this.openedMore = !this.openedMore;
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

  onMonthYearChangeFrom(change: MonthYearChange): void {
    this.monthFrom.set(change.month);
    this.yearFrom.set(change.year);
    this.updateCurrentDate();
    this.navigateCalendar();
  }

  onMonthYearChangeTo(change: MonthYearChange): void {
    this.monthTo.set(change.month);
    this.yearTo.set(change.year);
    this.updateCurrentDate();
  }

  private updateCurrentDate(): void {
    const date = new Date(this.yearFrom(), this.monthFrom(), 1);
    this.dateFrom.set(date);
    console.log(`Updated dateFrom to: ${date.toISOString().split('T')[0]}`);
  }

  private navigateCalendar(): void {
    // Programmatically navigate the Material Calendar to the current month/year
    if (this.calendarFrom) {
      this.calendarFrom.activeDate = new Date(this.yearFrom(), this.monthFrom(), 1);
      // Force the calendar to update its view
      this.cdr.detectChanges();
    }
  }
}
