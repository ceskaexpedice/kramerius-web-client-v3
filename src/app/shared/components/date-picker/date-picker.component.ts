import {
  AfterViewChecked,
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
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {LowerCasePipe} from '@angular/common';
import {MatCalendar, MatCalendarCellClassFunction} from '@angular/material/datepicker';
import {InputComponent} from '../input/input.component';
import {MonthYearChange, MonthYearSelectorComponent} from '../month-year-selector/month-year-selector.component';
import {FormsModule} from '@angular/forms';
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
    MatCalendar,
    InputComponent,
    MonthYearSelectorComponent,
    FormsModule,
    MatSlideToggle,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss'
})
export class DatePickerComponent implements OnInit, OnChanges, AfterViewChecked {

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
  @Input() showInput: boolean = true; // Control whether to show built-in input
  @Input() size: 'sm' | 'md' = 'md';

  minDate: Date = new Date(1400, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() datePickerChange = new EventEmitter<DatePickerOutput>();

  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);

  ngOnInit() {
    this.updateFromInitialValues();
  }

  ngAfterViewChecked() {
    if (this.openedPopupCalendar) {
      this.addLabelsToCalendarCells();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    // Only react to ACTUAL changes in input properties, not just change events
    let hasActualChanges = false;

    if (changes['initialDateFrom']) {
      const change = changes['initialDateFrom'];
      const currentValue = change.currentValue?.getTime();
      const previousValue = change.previousValue?.getTime();
      if (currentValue !== previousValue) {
        hasActualChanges = true;
      }
    }

    if (changes['initialDateTo']) {
      const change = changes['initialDateTo'];
      const currentValue = change.currentValue?.getTime();
      const previousValue = change.previousValue?.getTime();
      if (currentValue !== previousValue) {
        hasActualChanges = true;
      }
    }

    if (changes['initialOffset']) {
      const change = changes['initialOffset'];
      if (change.currentValue !== change.previousValue) {
        hasActualChanges = true;
      }
    }

    if (hasActualChanges) {
      this.updateFromInitialValues();

      // If the popup is open, also update the popup values
      if (this.openedPopupCalendar) {
        this.initializePopupValues();
      }
    }
  }

  toggleOpenPopupCalendar() {
    this.openedPopupCalendar = !this.openedPopupCalendar;
    if (this.openedPopupCalendar) {
      this.initializePopupValues();
      setTimeout(() => {
        this.positionPopup()
      }, 0);
    }
  }

  // Public method to open the popup (useful when showInput=false)
  openPopup() {
    if (!this.openedPopupCalendar) {
      this.openedPopupCalendar = true;
      this.initializePopupValues();
      setTimeout(() => {
        this.positionPopup()
      }, 0);
    }
  }

  // Public method to close the popup
  closePopup() {
    this.openedPopupCalendar = false;
  }

  private initializePopupValues() {
    // Initialize popup with current committed values, or today's date if no dateFrom exists
    const today = new Date();
    this.selectedDateFrom.set(this.fromDate() || today);
    this.selectedDateTo.set(this.toDate() || null);
    this.selectedOffset.set(this.offset());

    // Range mode is active when we have both dates, regardless of how they were created
    this.isRangeModeActive = !!(this.fromDate() && this.toDate());

    // Set calendar months based on selected dates or current date
    const baseDate = this.selectedDateFrom() || today;
    this.monthFrom.set(baseDate.getMonth());
    this.yearFrom.set(baseDate.getFullYear());

    if (this.selectedDateTo()) {
      this.monthTo.set(this.selectedDateTo()!.getMonth());
      this.yearTo.set(this.selectedDateTo()!.getFullYear());
    }

    // Ensure calendars navigate to correct month after view is initialized
    setTimeout(() => {
      this.forceCalendarNavigation();
      this.cdr.detectChanges();
    }, 0);

    // Additional refresh after DOM is fully rendered
    setTimeout(() => {
      this.forceCalendarRefresh();
    }, 100);
  }

  private positionPopup() {
    if (!this.popupCalendar) return;

    const popup = this.popupCalendar.nativeElement;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top: number;
    let left: number;

    if (this.showInput) {
      // Position relative to the built-in input
      const containerElement = this.popupCalendar.nativeElement.previousElementSibling;
      if (!containerElement) return;

      const rect = containerElement.getBoundingClientRect();
      top = rect.bottom - 50;
      left = rect.left;
    } else {
      // Position in center of screen when no built-in input
      const popupRect = popup.getBoundingClientRect();
      top = (viewportHeight - popupRect.height) / 2;
      left = (viewportWidth - popupRect.width) / 2;
    }

    // Ensure popup doesn't go off-screen horizontally
    const popupRect = popup.getBoundingClientRect();
    if (left + popupRect.width > viewportWidth) {
      left = viewportWidth - popupRect.width - 16;
    }
    if (left < 16) {
      left = 16; // Minimum margin from viewport edge
    }

    // Ensure popup doesn't go off-screen vertically
    if (this.showInput) {
      // For input-based positioning, try above if below doesn't fit
      if (top + popupRect.height > viewportHeight - 16) {
        const containerElement = this.popupCalendar.nativeElement.previousElementSibling;
        if (containerElement) {
          const rect = containerElement.getBoundingClientRect();
          const topPosition = rect.top - popupRect.height - 8;
          if (topPosition >= 16) {
            top = topPosition;
          } else {
            // If neither above nor below fits, position it with maximum available space
            top = Math.max(16, Math.min(top, viewportHeight - popupRect.height - 16));
          }
        }
      }
    } else {
      // For center positioning, just ensure it fits in viewport
      if (top < 16) top = 16;
      if (top + popupRect.height > viewportHeight - 16) {
        top = viewportHeight - popupRect.height - 16;
      }
    }

    popup.style.top = `${top}px`;
    popup.style.left = `${left}px`;
  }

  private updateFromInitialValues() {
    // Handle date clearing (when values are set to null/undefined)
    if (this.initialDateFrom) {
      this.fromDate.set(this.initialDateFrom);
      this.selectedDateFrom.set(this.initialDateFrom);
      this.monthFrom.set(this.initialDateFrom.getMonth());
      this.yearFrom.set(this.initialDateFrom.getFullYear());
    } else {
      // Clear date values when initialDateFrom is null/undefined
      this.fromDate.set(undefined);
      this.selectedDateFrom.set(null);
      // Reset to current month when no dates
      const now = new Date();
      this.monthFrom.set(now.getMonth());
      this.yearFrom.set(now.getFullYear());
    }

    if (this.initialDateTo) {
      this.toDate.set(this.initialDateTo);
      this.selectedDateTo.set(this.initialDateTo);
      this.monthTo.set(this.initialDateTo.getMonth());
      this.yearTo.set(this.initialDateTo.getFullYear());
    } else {
      // Clear date values when initialDateTo is null/undefined
      this.toDate.set(undefined);
      this.selectedDateTo.set(null);
      // Reset to current month when no dates
      const now = new Date();
      this.monthTo.set(now.getMonth());
      this.yearTo.set(now.getFullYear());
    }

    if (this.initialOffset !== undefined) {
      this.offset.set(this.initialOffset);
    } else {
      // Clear offset when not provided
      this.offset.set(0);
    }

    // Range mode is active when we have both initial dates, regardless of offset
    this.isRangeModeActive = !!(this.initialDateFrom && this.initialDateTo);

    this.forceCalendarRefresh();
  }

  // Computed property for showing two-calendar layout
  get showDualCalendarMode(): boolean {
    return this.isRangeModeActive;
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

    // Block selection if date is after current toDate
    const currentToDate = this.selectedDateTo();
    if (currentToDate && date > currentToDate) {
      return;
    }

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

    // Block selection if date is before current fromDate
    const currentFromDate = this.selectedDateFrom();
    if (currentFromDate && date < currentFromDate) {
      return;
    }

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
      // Entering range mode - clear offset and set dateTo to null for user selection
      // unless we already have both dates (from offset mode)
      // if (this.selectedOffset() === 0 || !this.selectedDateTo()) {
      //   this.selectedDateTo.set(null);
      // }
      this.selectedOffset.set(0);
      this.selectedDateTo.set(this.selectedDateFrom());
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

  private forceCalendarNavigation(): void {
    // Navigate calendars to the correct months based on selected dates
    if (this.calendarFrom && this.selectedDateFrom()) {
      this.calendarFrom.activeDate = new Date(this.yearFrom(), this.monthFrom(), 1);
    }

    if (this.calendarTo && this.selectedDateTo()) {
      this.calendarTo.activeDate = new Date(this.yearTo(), this.monthTo(), 1);
    }
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

  // Date class function for "FROM" calendar
  get dateClassFrom(): MatCalendarCellClassFunction<Date> {
    return (date: Date, view: string): string => {
      const fromDate = this.selectedDateFrom();
      const toDate = this.selectedDateTo();

      if (!fromDate || !toDate) {
        return '';
      }

      // Compare just the date strings for accurate comparison
      const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const fromStr = `${fromDate.getFullYear()}-${fromDate.getMonth()}-${fromDate.getDate()}`;
      const toStr = `${toDate.getFullYear()}-${toDate.getMonth()}-${toDate.getDate()}`;

      if (dateStr === fromStr && dateStr === toStr) {
        return 'range-start range-end';
      } else if (dateStr === fromStr) {
        return 'range-start';
      } else if (dateStr === toStr) {
        return 'range-end';
      } else {
        // Check if date is between fromDate and toDate
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const checkFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const checkTo = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

        if (checkDate > checkFrom && checkDate < checkTo) {
          return 'range-middle';
        }
      }

      // Mark dates after toDate as invalid in FROM calendar
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const checkTo = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
      if (checkDate > checkTo) {
        return 'invalid-date';
      }

      return '';
    };
  }

  // Date class function for "TO" calendar
  get dateClassTo(): MatCalendarCellClassFunction<Date> {
    return (date: Date, view: string): string => {
      const fromDate = this.selectedDateFrom();
      const toDate = this.selectedDateTo();

      if (!fromDate || !toDate) {
        return '';
      }

      // Compare just the date strings for accurate comparison
      const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const fromStr = `${fromDate.getFullYear()}-${fromDate.getMonth()}-${fromDate.getDate()}`;
      const toStr = `${toDate.getFullYear()}-${toDate.getMonth()}-${toDate.getDate()}`;

      if (dateStr === fromStr && dateStr === toStr) {
        return 'range-start range-end';
      } else if (dateStr === fromStr) {
        return 'range-start';
      } else if (dateStr === toStr) {
        return 'range-end';
      } else {
        // Check if date is between fromDate and toDate
        const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const checkFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
        const checkTo = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());

        if (checkDate > checkFrom && checkDate < checkTo) {
          return 'range-middle';
        }
      }

      // Mark dates before fromDate as invalid in TO calendar
      const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const checkFrom = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
      if (checkDate < checkFrom) {
        return 'invalid-date';
      }

      return '';
    };
  }



  onOffsetClick(days: number) {
    this.selectedOffset.set(days);
    this.isRangeModeActive = true; // Enable range mode to show second calendar

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
    // Reset to initial values
    this.fromDate.set(this.initialDateFrom || undefined);
    this.toDate.set(this.initialDateTo || undefined);
    this.offset.set(this.initialOffset || 0);
    this.selectedDateFrom.set(this.initialDateFrom || null);
    this.selectedDateTo.set(this.initialDateTo || null);
    this.selectedOffset.set(this.initialOffset || 0);
    this.isRangeModeActive = !!(this.initialDateFrom && this.initialDateTo);
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
      // Create dates at noon local time to avoid timezone conversion issues
      const normalizeToNoon = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);

      const normalizedFromDate = normalizeToNoon(fromDate);
      const normalizedToDate = normalizeToNoon(toDate);

      this.dateRangeChange.emit({ from: normalizedFromDate, to: normalizedToDate });
      this.datePickerChange.emit({ dateFrom: normalizedFromDate, offset, dateTo: normalizedToDate });
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

  getSelectedDaysCount() : number {
    if (this.selectedDateFrom() && this.selectedDateTo()) {
      const diffTime = this.selectedDateTo()!.getTime() - this.selectedDateFrom()!.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

      return diffDays >= 0 ? diffDays : 0; // Ensure non-negative
    }
    return 0;
  }

  getDayTranslationKey(): string {
    const count = this.getSelectedDaysCount();
    return count === 1 ? 'one-day' : 'more-days';
  }

  private addLabelsToCalendarCells(): void {
    const fromLabel = this.translate.instant('date--from');
    const toLabel = this.translate.instant('date--to');

    // Find all range-start cells and add the from label
    const rangeStartCells = document.querySelectorAll('.mat-calendar-body-cell.range-start');
    rangeStartCells.forEach(cell => {
      (cell as HTMLElement).setAttribute('label', fromLabel);
    });

    // Find all range-end cells and add the to label (excluding cells that are both start and end)
    const rangeEndCells = document.querySelectorAll('.mat-calendar-body-cell.range-end:not(.range-start)');
    rangeEndCells.forEach(cell => {
      (cell as HTMLElement).setAttribute('label', toLabel);
    });

    // Find all invalid-date cells in the FROM calendar and add the from label
    if (this.calendarFrom) {
      const fromCalendarElement = this.calendarFrom['_elementRef'].nativeElement;
      const invalidFromCells = fromCalendarElement.querySelectorAll('.mat-calendar-body-cell.invalid-date');
      invalidFromCells.forEach((cell: HTMLElement) => {
        cell.setAttribute('label', fromLabel);
      });
    }

    // Find all invalid-date cells in the TO calendar and add the to label
    if (this.calendarTo) {
      const toCalendarElement = this.calendarTo['_elementRef'].nativeElement;
      const invalidToCells = toCalendarElement.querySelectorAll('.mat-calendar-body-cell.invalid-date');
      invalidToCells.forEach((cell: HTMLElement) => {
        cell.setAttribute('label', toLabel);
      });
    }
  }
}
