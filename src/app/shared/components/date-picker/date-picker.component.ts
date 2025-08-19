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
import {ButtonToggleComponent} from '../button-toggle/button-toggle.component';
import {MatSlideToggle} from '@angular/material/slide-toggle';

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
    ButtonToggleComponent,
    MatSlideToggle,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements OnInit {

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

  @ViewChild('calendarFrom') calendarFrom!: MatCalendar<Date>;
  @ViewChild('calendarTo') calendarTo!: MatCalendar<Date>;
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
    console.log('Updating from initial values:', this.initialDateFrom, this.initialDateTo, this.initialOffset);
    // Initialize with provided values if available
    if (this.initialDateFrom) {
      this.fromDate.set(this.initialDateFrom);
      this.selectedDateFrom.set(this.initialDateFrom);
      this.monthFrom.set(this.initialDateFrom.getMonth());
      this.yearFrom.set(this.initialDateFrom.getFullYear());
    }

    if (this.initialDateTo) {
      this.toDate.set(this.initialDateTo);
      this.selectedDateTo.set(this.initialDateTo);
      this.monthTo.set(this.initialDateTo.getMonth());
      this.yearTo.set(this.initialDateTo.getFullYear());
    }

    if (this.initialOffset !== undefined) {
      this.offset.set(this.initialOffset);
    }

    this.isRangeModeActive = !!this.selectedDateFrom;

    this.forceCalendarRefresh();
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
  onDateFromSelect(date: Date | null): void {
    if (!date) return;

    this.selectedDateFrom.set(date);

    // Auto-calculate toDate based on offset
    if (this.selectedOffset() > 0) {
      const calculatedToDate = new Date(date.getTime() + this.selectedOffset() * 24 * 60 * 60 * 1000);
      this.selectedDateTo.set(calculatedToDate);
      this.updateToCalendarMonth(calculatedToDate);
    } else if (!this.isRangeModeActive) {
      this.selectedDateTo.set(null);
    }

    if (!this.selectedDateTo()) {
      this.selectedDateTo.set(date);
      this.updateToCalendarMonth(date);
      this.monthFrom.set(date.getMonth());
      this.yearFrom.set(date.getFullYear());
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
  }

  onDateToSelect(date: Date | null): void {
    if (!date) return;

    this.selectedDateTo.set(date);

    // Calculate offset if in offset mode
    if (!this.isRangeModeActive && this.selectedDateFrom()) {
      const diffTime = date.getTime() - this.selectedDateFrom()!.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      this.selectedOffset.set(Math.max(0, diffDays));
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
  }

  onRangeModeToggle(event?: any): void {
    this.isRangeModeActive = event?.checked ?? !this.isRangeModeActive;

    if (this.isRangeModeActive) {
      // Entering range mode - clear offset
      this.selectedOffset.set(0);
      if (this.selectedDateFrom() && !this.selectedDateTo()) {
        this.updateToCalendarMonth(this.selectedDateFrom()!);
      }
    } else {
      // Exiting range mode - clear selected end date and offset
      this.selectedDateTo.set(null);
      this.selectedOffset.set(0);
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
  }

  private updateToCalendarMonth(date: Date): void {
    this.monthTo.set(date.getMonth());
    this.yearTo.set(date.getFullYear());
  }

  private forceCalendarRefresh(): void {
    // Force change detection to update calendar highlighting
    this.cdr.detectChanges();

    // Trigger a refresh of the calendar views by slightly modifying and resetting active dates
    setTimeout(() => {
      if (this.calendarFrom) {
        const currentActive = this.calendarFrom.activeDate;
        this.calendarFrom.activeDate = new Date(currentActive.getTime() + 1);
        this.calendarFrom.activeDate = currentActive;
        this.calendarFrom.updateTodaysDate();
      }
      if (this.calendarTo) {
        const currentActive = this.calendarTo.activeDate;
        this.calendarTo.activeDate = new Date(currentActive.getTime() + 1);
        this.calendarTo.activeDate = currentActive;
        this.calendarTo.updateTodaysDate();
      }
      this.cdr.detectChanges();
    }, 0);
  }

  // Date class function for range highlighting
  get dateClass() {
    // Return a new function reference that captures current signal values
    return (date: Date): string => {
      const fromDate = this.selectedDateFrom();
      const toDate = this.selectedDateTo();

      if (!fromDate || !toDate) {
        return '';
      }

      const dateTime = date.getTime();
      const fromTime = fromDate.getTime();
      const toTime = toDate.getTime();

      // Ensure fromTime <= toTime
      const startTime = Math.min(fromTime, toTime);
      const endTime = Math.max(fromTime, toTime);

      if (dateTime === startTime && dateTime === endTime) {
        return 'range-start range-end';
      } else if (dateTime === startTime) {
        return 'range-start';
      } else if (dateTime === endTime) {
        return 'range-end';
      } else if (dateTime > startTime && dateTime < endTime) {
        return 'range-middle';
      }

      return '';
    };
  }



  onOffsetClick(days: number) {
    this.selectedOffset.set(days);
    this.isRangeModeActive = false; // Offset mode is not range mode

    if (this.selectedDateFrom()) {
      const calculatedToDate = new Date(this.selectedDateFrom()!.getTime() + days * 24 * 60 * 60 * 1000);
      this.selectedDateTo.set(calculatedToDate);
      this.updateToCalendarMonth(calculatedToDate);
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
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
    this.updateDateFrom();
    this.navigateCalendarFrom();
  }

  onMonthYearChangeTo(change: MonthYearChange): void {
    this.monthTo.set(change.month);
    this.yearTo.set(change.year);
    this.updateDateTo();
    this.navigateCalendarTo();
  }

  private updateDateFrom(): void {
    const date = new Date(this.yearFrom(), this.monthFrom(), 1);
    this.fromDate.set(date);
  }

  private updateDateTo(): void {
    const date = new Date(this.yearTo(), this.monthTo(), 1);
    this.toDate.set(date);
  }

  private navigateCalendarFrom(): void {
    // Programmatically navigate the Material Calendar to the current month/year
    if (this.calendarFrom) {
      this.calendarFrom.activeDate = new Date(this.yearFrom(), this.monthFrom(), 1);
      // Force the calendar to update its view
      this.cdr.detectChanges();
    }
  }

  private navigateCalendarTo(): void {
    // Programmatically navigate the Material Calendar to the current month/year
    if (this.calendarTo) {
      this.calendarTo.activeDate = new Date(this.yearTo(), this.monthTo(), 1);
      // Force the calendar to update its view
      this.cdr.detectChanges();
    }
  }
}
