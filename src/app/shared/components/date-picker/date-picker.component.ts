import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter, inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
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

  // Temporary working values (for popup)
  selectedDateFrom = signal<Date | null>(null);
  selectedDateTo = signal<Date | null>(null);
  selectedOffset = signal<number>(0);

  // Calendar navigation
  monthFrom = signal(new Date().getMonth());
  yearFrom = signal(new Date().getFullYear());
  monthTo = signal(new Date().getMonth());
  yearTo = signal(new Date().getFullYear());

  // Final committed values
  fromDate = signal<Date | undefined>(undefined);
  toDate = signal<Date | undefined>(undefined);
  offset = signal<number>(0);

  @ViewChild(MatCalendar) calendarFrom!: MatCalendar<Date>;
  @ViewChild('popupCalendar') popupCalendar!: ElementRef;


  @Input() initialDateFrom: Date | null = null;
  @Input() initialDateTo: Date | null = null;
  @Input() initialOffset: number = 0;

  minDate: Date = new Date(1400, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

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
    if (this.openedPopupCalendar) {
      this.initializePopupValues();
      setTimeout(() => this.positionPopup(), 0);
    }
  }

  private initializePopupValues() {
    // Initialize popup with current committed values
    this.selectedDateFrom.set(this.fromDate() || null);
    this.selectedDateTo.set(this.toDate() || null);
    this.selectedOffset.set(this.offset());
    this.isRangeModeActive = !!(this.toDate() && this.fromDate() && this.offset() === 0);

    // Set calendar months based on selected dates or current date
    const baseDate = this.selectedDateFrom() || new Date();
    this.monthFrom.set(baseDate.getMonth());
    this.yearFrom.set(baseDate.getFullYear());

    if (this.selectedDateTo()) {
      this.monthTo.set(this.selectedDateTo()!.getMonth());
      this.yearTo.set(this.selectedDateTo()!.getFullYear());
    }
  }

  private positionPopup() {
    if (!this.popupCalendar) return;

    const containerElement = this.popupCalendar.nativeElement.previousElementSibling;
    if (!containerElement) return;

    const rect = containerElement.getBoundingClientRect();
    const popup = this.popupCalendar.nativeElement;

    // Position below the input
    popup.style.top = `${rect.bottom + 8}px`;
    popup.style.left = `${rect.left}px`;

    // Ensure popup doesn't go off-screen
    const popupRect = popup.getBoundingClientRect();
    const viewportWidth = window.innerWidth;

    if (popupRect.right > viewportWidth) {
      popup.style.left = `${viewportWidth - popupRect.width - 16}px`;
    }
  }

  private updateFromInitialValues() {
    // Initialize with provided values if available
    if (this.initialDateFrom) {
      this.fromDate.set(this.initialDateFrom);
    }

    if (this.initialDateTo) {
      this.toDate.set(this.initialDateTo);
    }

    if (this.initialOffset !== undefined) {
      this.offset.set(this.initialOffset);
    }
  }

  // Template methods
  getSelectedDateText(): string {
    const fromDate = this.fromDate();
    const toDate = this.toDate();
    const offset = this.offset();

    if (fromDate && toDate && offset === 0) {
      return `${this.formatDate(fromDate)} - ${this.formatDate(toDate)}`;
    } else if (fromDate && offset > 0) {
      return `${this.formatDate(fromDate)} + ${offset} ${offset === 1 ? 'day' : 'days'}`;
    } else if (fromDate) {
      return this.formatDate(fromDate);
    }
    return 'DD.MM.YYYY';
  }

  getFormattedDate(date: Date | null): string {
    return date ? this.formatDate(date) : '';
  }

  private formatDate(date: Date): string {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  // Calendar interaction methods
  onDateFromSelect(date: Date): void {
    this.selectedDateFrom.set(date);

    // Auto-calculate toDate based on offset
    if (this.selectedOffset() >= 0) {
      const calculatedToDate = new Date(date.getTime() + this.selectedOffset() * 24 * 60 * 60 * 1000);
      this.selectedDateTo.set(calculatedToDate);
      this.updateToCalendarMonth(calculatedToDate);
    } else if (!this.isRangeModeActive) {
      this.selectedDateTo.set(null);
    }
  }

  onDateToSelect(date: Date): void {
    this.selectedDateTo.set(date);

    // Calculate offset if in offset mode
    if (!this.isRangeModeActive && this.selectedDateFrom()) {
      const diffTime = date.getTime() - this.selectedDateFrom()!.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      this.selectedOffset.set(Math.max(0, diffDays));
    }
  }

  onRangeModeToggle(): void {
    if (this.isRangeModeActive) {
      this.selectedOffset.set(0);
      if (this.selectedDateFrom() && !this.selectedDateTo()) {
        this.updateToCalendarMonth(this.selectedDateFrom()!);
      }
    } else {
      this.selectedDateTo.set(null);
      this.selectedOffset.set(0);
    }
  }

  private updateToCalendarMonth(date: Date): void {
    this.monthTo.set(date.getMonth());
    this.yearTo.set(date.getFullYear());
  }



  onOffsetClick(days: number) {
    this.selectedOffset.set(days);
    this.isRangeModeActive = false;

    if (this.selectedDateFrom()) {
      const calculatedToDate = new Date(this.selectedDateFrom()!.getTime() + days * 24 * 60 * 60 * 1000);
      this.selectedDateTo.set(calculatedToDate);
      this.updateToCalendarMonth(calculatedToDate);
    }
  }

  // Action button methods
  onDiscard(): void {
    this.openedPopupCalendar = false;
    // Reset to original values - no changes are committed
  }

  onSubmit(): void {
    // Commit the selected values to the actual state
    this.fromDate.set(this.selectedDateFrom() || undefined);
    this.toDate.set(this.selectedDateTo() || undefined);
    this.offset.set(this.selectedOffset());

    this.openedPopupCalendar = false;
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

  onMonthYearChangeFrom(change: MonthYearChange): void {
    this.monthFrom.set(change.month);
    this.yearFrom.set(change.year);
    this.cdr.detectChanges();
  }

  onMonthYearChangeTo(change: MonthYearChange): void {
    this.monthTo.set(change.month);
    this.yearTo.set(change.year);
  }

}
