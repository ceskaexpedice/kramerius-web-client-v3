import {
  AfterViewChecked,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter, inject,
  HostListener,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DateRange } from '../range-slider/range-slider.component';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { LowerCasePipe } from '@angular/common';
import { MatCalendar, MatCalendarCellClassFunction } from '@angular/material/datepicker';
import { InputComponent } from '../input/input.component';
import { MonthYearChange, MonthYearSelectorComponent } from '../month-year-selector/month-year-selector.component';
import { FormsModule } from '@angular/forms';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { ClickOutsideDirective } from '../../directives/click-outside';
import { DateAdapter, MAT_DATE_LOCALE, NativeDateAdapter } from '@angular/material/core';
import { Platform } from '@angular/cdk/platform';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export interface DatePickerOutput {
  dateFrom: Date;
  offset: number;
  dateTo: Date;
}

class MondayFirstNativeDateAdapter extends NativeDateAdapter {
  override getFirstDayOfWeek(): number {
    return 1; // Monday
  }
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
    ClickOutsideDirective,
  ],
  templateUrl: './date-picker.component.html',
  styleUrl: './date-picker.component.scss',
  providers: [
    {
      provide: DateAdapter,
      useClass: MondayFirstNativeDateAdapter,
      deps: [MAT_DATE_LOCALE, Platform],
    },
    {
      provide: MAT_DATE_LOCALE,
      useFactory: () => {
        return typeof navigator !== 'undefined' ? navigator.language : 'en';
      },
    },
  ],
})
export class DatePickerComponent implements OnInit, OnChanges, AfterViewChecked {

  openedPopupCalendar: boolean = false;
  isRangeModeActive = false;
  isOpen = false;

  // Temporary working values (for popup)
  selectedDateFrom = signal<Date | null>(null);
  selectedDateTo = signal<Date | null>(null);
  selectedOffset = signal<number>(0);

  // Manual date input strings
  dateFromInput = signal<string>('');
  dateToInput = signal<string>('');

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
  @Input() size: 'sm' | 'md' | 'lg' | 'md-lg' = 'md';

  minDate: Date = new Date(1400, 0, 1);
  maxDate: Date = new Date(2100, 11, 31);

  @Output() dateRangeChange = new EventEmitter<DateRange>();
  @Output() datePickerChange = new EventEmitter<DatePickerOutput>();

  private cdr = inject(ChangeDetectorRef);
  private translate = inject(TranslateService);
  private dateAdapter = inject<DateAdapter<Date>>(DateAdapter);
  private destroyRef = inject(DestroyRef);

  @HostListener('document:keydown.enter')
  onEnterKey(): void {
    if (this.openedPopupCalendar) {
      this.onSubmit();
    }
  }

  ngOnInit() {
    this.updateFromInitialValues();

    const applyLocaleFromTranslate = () => {
      const lang = this.translate.getCurrentLang() || this.translate.getDefaultLang();
      if (lang) {
        this.dateAdapter.setLocale(lang);
        this.forceCalendarRefresh();
      }
    };

    applyLocaleFromTranslate();

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => applyLocaleFromTranslate());
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
        this.positionPopup();
        this.isOpen = true;
      }, 0);
    } else {
      this.isOpen = false;
    }
  }

  // Public method to open the popup (useful when showInput=false)
  openPopup() {
    if (!this.openedPopupCalendar) {
      this.openedPopupCalendar = true;
      this.initializePopupValues();
      setTimeout(() => {
        this.positionPopup();
        this.isOpen = true;
      }, 0);
    }
  }

  // Public method to close the popup
  closePopup() {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.openedPopupCalendar = false;
  }

  private initializePopupValues() {
    // Initialize popup with current committed values, or today's date if no dateFrom exists
    const today = new Date();
    const initialFromDate = this.fromDate() || today;
    const initialToDate = this.toDate() || initialFromDate; // Default to same as fromDate if no toDate

    this.selectedDateFrom.set(initialFromDate);
    this.selectedDateTo.set(initialToDate);
    this.selectedOffset.set(this.offset());

    // Initialize input strings
    this.dateFromInput.set(this.formatDate(initialFromDate));
    this.dateToInput.set(this.formatDate(initialToDate));

    // Range mode is active when we have both dates, regardless of how they were created
    this.isRangeModeActive = !!(this.fromDate() && this.toDate());

    // Set calendar months based on selected dates
    this.monthFrom.set(initialFromDate.getMonth());
    this.yearFrom.set(initialFromDate.getFullYear());
    this.monthTo.set(initialToDate.getMonth());
    this.yearTo.set(initialToDate.getFullYear());

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

  // Parse date string in DD.MM.YYYY format
  private parseDate(dateStr: string): Date | null {
    if (!dateStr || dateStr.trim() === '') return null;

    // Remove any whitespace
    dateStr = dateStr.trim();

    // Check for DD.MM.YYYY format
    const datePattern = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/;
    const match = dateStr.match(datePattern);

    if (!match) return null;

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validate ranges
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (year < 1400 || year > 2100) return null;

    // Create date (month is 0-indexed in JavaScript Date)
    const date = new Date(year, month - 1, day);

    // Verify the date is valid (e.g., not Feb 30)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      return null;
    }

    return date;
  }

  // Handle manual input for "from" date
  onDateFromInputChange(value: string): void {
    this.dateFromInput.set(value);
    const parsedDate = this.parseDate(value);

    if (parsedDate) {
      // Valid date entered
      this.selectedDateFrom.set(parsedDate);
      this.monthFrom.set(parsedDate.getMonth());
      this.yearFrom.set(parsedDate.getFullYear());

      // Auto-calculate toDate based on offset if applicable
      if (this.selectedOffset() > 0) {
        const calculatedToDate = new Date(parsedDate.getTime() + this.selectedOffset() * 24 * 60 * 60 * 1000);
        this.selectedDateTo.set(calculatedToDate);
        this.dateToInput.set(this.formatDate(calculatedToDate));
        this.updateToCalendarMonth(calculatedToDate);
      } else if (!this.isRangeModeActive) {
        // No offset, no range mode — keep TO in sync with FROM
        this.selectedDateTo.set(parsedDate);
        this.dateToInput.set(this.formatDate(parsedDate));
        this.updateToCalendarMonth(parsedDate);
      }

      // Trigger change detection to update month-year selector
      this.cdr.detectChanges();

      // Navigate calendar to show the entered date
      this.forceCalendarNavigation();
      this.forceCalendarRefresh();
    }
  }

  // Handle manual input for "to" date
  onDateToInputChange(value: string): void {
    this.dateToInput.set(value);
    const parsedDate = this.parseDate(value);

    if (parsedDate) {
      // Valid date entered
      const fromDate = this.selectedDateFrom();

      // Validate that "to" date is not before "from" date in range mode
      if (this.isRangeModeActive && fromDate && parsedDate < fromDate) {
        return; // Invalid: to date cannot be before from date
      }

      this.selectedDateTo.set(parsedDate);
      this.monthTo.set(parsedDate.getMonth());
      this.yearTo.set(parsedDate.getFullYear());

      // Calculate offset if applicable
      if (!this.isRangeModeActive && fromDate) {
        const diffTime = parsedDate.getTime() - fromDate.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        this.selectedOffset.set(Math.max(0, diffDays));
      }

      // Trigger change detection to update month-year selector
      this.cdr.detectChanges();

      // Navigate calendar to show the entered date
      this.forceCalendarNavigation();
      this.forceCalendarRefresh();
    }
  }

  // Calendar interaction methods
  onDateFromSelect(date: Date | null): void {
    if (!date) return;

    // Block selection if date is after current toDate (only in range mode)
    if (this.isRangeModeActive) {
      const currentToDate = this.selectedDateTo();
      if (currentToDate && date > currentToDate) {
        return;
      }
    }

    this.selectedDateFrom.set(date);
    this.dateFromInput.set(this.formatDate(date)); // Update input string

    // Auto-calculate toDate based on offset
    if (this.selectedOffset() > 0) {
      const calculatedToDate = new Date(date.getTime() + this.selectedOffset() * 24 * 60 * 60 * 1000);
      this.selectedDateTo.set(calculatedToDate);
      this.dateToInput.set(this.formatDate(calculatedToDate)); // Update input string
      this.updateToCalendarMonth(calculatedToDate);
    } else if (!this.isRangeModeActive) {
      this.selectedDateTo.set(null);
      this.dateToInput.set('');
    }

    if (!this.selectedDateTo()) {
      this.selectedDateTo.set(date);
      this.dateToInput.set(this.formatDate(date)); // Update input string
      this.updateToCalendarMonth(date);
      this.monthFrom.set(date.getMonth());
      this.yearFrom.set(date.getFullYear());
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
  }

  onDateToSelect(date: Date | null): void {
    if (!date) return;

    // Block selection if date is before current fromDate (only in range mode)
    if (this.isRangeModeActive) {
      const currentFromDate = this.selectedDateFrom();
      if (currentFromDate && date < currentFromDate) {
        return;
      }
    }

    this.selectedDateTo.set(date);
    this.dateToInput.set(this.formatDate(date)); // Update input string

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
      // Update input string for "to" date
      if (this.selectedDateFrom()) {
        this.dateToInput.set(this.formatDate(this.selectedDateFrom()!));
      }
    } else {
      // Exiting range mode - clear selected end date and offset
      this.selectedDateTo.set(null);
      this.selectedOffset.set(0);
      this.dateToInput.set(''); // Clear input string
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
      // Only apply special styling if in range mode
      if (!this.isRangeModeActive) {
        return '';
      }

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
        // FROM calendar: ONLY show range-start
        return 'range-start';
      } else if (dateStr === toStr) {
        // FROM calendar: DO NOT show range-end styling
        return '';
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
      // Only apply special styling if in range mode
      if (!this.isRangeModeActive) {
        return '';
      }

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
        // TO calendar: DO NOT show range-start styling
        return '';
      } else if (dateStr === toStr) {
        // TO calendar: ONLY show range-end
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
      this.dateToInput.set(this.formatDate(calculatedToDate)); // Update input string
      this.updateToCalendarMonth(calculatedToDate);
    }

    // Force calendar to refresh highlighting
    this.forceCalendarRefresh();
  }

  // Action button methods
  onDiscard(): void {
    // Clear all date values completely
    this.fromDate.set(undefined);
    this.toDate.set(undefined);
    this.offset.set(0);
    this.selectedDateFrom.set(null);
    this.selectedDateTo.set(null);
    this.selectedOffset.set(0);
    this.isRangeModeActive = false;

    // Close the popup
    this.isOpen = false;
    this.openedPopupCalendar = false;

    // Emit empty/null values to parent to clear the filter
    this.dateRangeChange.emit({ from: null as any, to: null as any });
    this.datePickerChange.emit({ dateFrom: null as any, offset: 0, dateTo: null as any });
  }

  onSubmit(): void {
    // Commit the selected values to the actual state
    this.fromDate.set(this.selectedDateFrom() || undefined);
    this.toDate.set(this.selectedDateTo() || undefined);
    this.offset.set(this.selectedOffset());

    this.isOpen = false;
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

  getSelectedDaysCount(): number {
    if (this.selectedDateFrom() && this.selectedDateTo()) {
      const diffTime = this.selectedDateTo()!.getTime() - this.selectedDateFrom()!.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates

      return diffDays >= 0 ? diffDays : 0; // Ensure non-negative
    }
    return 0;
  }

  getDayTranslationKey(): string {
    const count = this.getSelectedDaysCount();

    // Slovak and Czech: 1 = singular, 2-4 = few, 5+ = many
    // Polish and English: 1 = singular, 2+ = few (many form same as few)
    if (count === 1) return 'day-singular';
    if (count >= 2 && count <= 4) return 'day-plural-few';
    return 'day-plural-many';
  }

  private addLabelsToCalendarCells(): void {
    const fromLabel = this.translate.instant('date--from');
    const toLabel = this.translate.instant('date--to');

    const fromDate = this.selectedDateFrom();
    const toDate = this.selectedDateTo();
    const isSameDate = fromDate && toDate &&
      fromDate.getFullYear() === toDate.getFullYear() &&
      fromDate.getMonth() === toDate.getMonth() &&
      fromDate.getDate() === toDate.getDate();

    // Handle cells in the FROM calendar - ONLY show range-start label
    if (this.calendarFrom) {
      const fromCalendarElement = this.calendarFrom['_elementRef'].nativeElement;

      if (isSameDate) {
        // When dates are the same, show "from" label in FROM calendar for the same date cell
        const rangeBothCells = fromCalendarElement.querySelectorAll('.mat-calendar-body-cell.range-start.range-end');
        rangeBothCells.forEach((cell: HTMLElement) => {
          cell.setAttribute('label', fromLabel);
        });
      } else {
        // When dates are different, ONLY show "from" for range-start (not range-end)
        const rangeStartCells = fromCalendarElement.querySelectorAll('.mat-calendar-body-cell.range-start:not(.range-end)');
        rangeStartCells.forEach((cell: HTMLElement) => {
          cell.setAttribute('label', fromLabel);
        });
      }

      // Add from label to invalid-date cells in FROM calendar
      const invalidFromCells = fromCalendarElement.querySelectorAll('.mat-calendar-body-cell.invalid-date');
      invalidFromCells.forEach((cell: HTMLElement) => {
        cell.setAttribute('label', fromLabel);
      });
    }

    // Handle cells in the TO calendar - ONLY show range-end label
    if (this.calendarTo) {
      const toCalendarElement = this.calendarTo['_elementRef'].nativeElement;

      if (isSameDate) {
        // When dates are the same, show "to" label in TO calendar for the same date cell
        const rangeBothCells = toCalendarElement.querySelectorAll('.mat-calendar-body-cell.range-start.range-end');
        rangeBothCells.forEach((cell: HTMLElement) => {
          cell.setAttribute('label', toLabel);
        });
      } else {
        // When dates are different, ONLY show "to" for range-end (not range-start)
        const rangeEndCells = toCalendarElement.querySelectorAll('.mat-calendar-body-cell.range-end:not(.range-start)');
        rangeEndCells.forEach((cell: HTMLElement) => {
          cell.setAttribute('label', toLabel);
        });
      }

      // Add to label to invalid-date cells in TO calendar
      const invalidToCells = toCalendarElement.querySelectorAll('.mat-calendar-body-cell.invalid-date');
      invalidToCells.forEach((cell: HTMLElement) => {
        cell.setAttribute('label', toLabel);
      });
    }
  }
}
