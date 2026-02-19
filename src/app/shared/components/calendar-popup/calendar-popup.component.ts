import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  signal,
  SimpleChanges,
  ChangeDetectorRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import { NgIf } from '@angular/common';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { RecordHandlerService } from '../../services/record-handler.service';
import { Store } from '@ngrx/store';
import { loadMonthIssues } from '../../../modules/periodical/state/periodical-detail/periodical-detail.actions';
import {
  selectMonthIssues,
  selectMonthLoading,
  selectPidFromAvailableYears,
  selectPeriodicalState,
} from '../../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { Subject, take } from 'rxjs';
import { takeUntil, distinctUntilChanged } from 'rxjs/operators';
import { MonthYearSelectorComponent, MonthYearChange } from '../month-year-selector/month-year-selector.component';
import { ClickOutsideDirective } from '../../directives/click-outside/click-outside.directive';

@Component({
  selector: 'app-calendar-popup',
  imports: [
    MatCalendar,
    NgIf,
    MonthYearSelectorComponent,
    ClickOutsideDirective,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useFactory: (translate: TranslateService) => translate.currentLang,
      deps: [TranslateService],
    },
  ],
  template: `
    <div class="calendar-dropdown" appClickOutside (clickOutside)="close()">
<!--      <div class="calendar-popup-header">-->
<!--        <button class="nav-btn" (click)="previousMonth()">-->
<!--          <i class="icon-arrow-left-1"></i>-->
<!--        </button>-->
<!--        <h3>{{ monthNames[currentMonth()] }} {{ currentYear() }}</h3>-->
<!--        <button class="nav-btn" (click)="nextMonth()">-->
<!--          <i class="icon-arrow-right-1"></i>-->
<!--        </button>-->
<!--        <button class="close-btn" (click)="close()">×</button>-->
<!--      </div>-->
      <div class="calendar-popup-selectors">
        <app-month-year-selector
          [month]="currentMonth()"
          [year]="currentYear()"
          (monthYearChange)="onMonthYearChange($event)">
        </app-month-year-selector>
      </div>
      <div class="single-calendar-container">
        <div class="loading-overlay" *ngIf="isLoadingCalendar()">
          <div class="loading-spinner">
            <div class="spinner"></div>
            <span>Loading...</span>
          </div>
        </div>
        <mat-calendar class="custom-label"
                      [class.loading]="isLoadingCalendar()"
                      [dateClass]="dateClass"
                      [startAt]="currentDate()"
                      [startView]="'month'"
                      (selectedChange)="onDateSelected($event)">
        </mat-calendar>
      </div>
    </div>
  `,
  styles: `
    .calendar-dropdown {
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: var(--color-bg-base);
      border-radius: var(--spacing-x2);
      box-shadow: 0 2px 16px 2px rgba(0, 0, 0, 0.08);
      width: 280px;
      z-index: 800;
      margin-top: 4px;
      padding: var(--spacing-x2) var(--spacing-x5) var(--spacing-x5) var(--spacing-x5);
    }

    .calendar-popup-header {
      display: flex;
      align-items: center;
      padding: 16px 20px;
      border-bottom: 1px solid #e0e0e0;
      background: #f5f5f5;
      border-radius: 8px 8px 0 0;
      gap: 12px;
    }

    .calendar-popup-header h3 {
      margin: 0;
      font-size: calc(18px * var(--accessibility-text-scale));
      font-weight: 600;
      color: #333;
      flex: 1;
      text-align: center;
    }

    .nav-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #666;
      padding: 8px;
      border-radius: 50%;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .nav-btn:hover {
      background-color: #e0e0e0;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: calc(20px * var(--accessibility-text-scale));
      cursor: pointer;
      color: #666;
      padding: 4px;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      transition: background-color 0.2s;
    }

    .close-btn:hover {
      background-color: #e0e0e0;
    }

    .calendar-popup-selectors {
      padding: var(--spacing-x2) 0;
      border-bottom: 1px solid var(--color-border-bright);
    }

    .single-calendar-container {
      margin-top: var(--spacing-x2);
      display: flex;
      justify-content: center;
      position: relative;
    }

    .loading-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: var(--calendar-popup-content-ts);
      border-radius: 8px;
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid var(--color-primary, #007bff);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    .loading-spinner span {
      font-size: var(--font-size-small);
      color: #666;
      font-weight: 500;
    }

    @keyframes spin {
      0% {
        transform: rotate(0deg);
      }
      100% {
        transform: rotate(360deg);
      }
    }

    :host ::ng-deep .mat-calendar-header {
      display: none !important;
    }

    :host ::ng-deep .mat-calendar {
      width: 100%;
      transition: opacity 0.2s ease;
    }

    :host ::ng-deep .mat-calendar.loading {
      opacity: 0.5;
    }

    :host ::ng-deep .mat-calendar-content {
      padding: 0 !important;
    }

    :host ::ng-deep .mat-calendar-table {
      width: 100%;
      border-collapse: collapse;
    }

    :host ::ng-deep button {
      padding: 8px 2px;
    }

    :host ::ng-deep .mat-calendar-body-label {
      visibility: hidden !important;
      padding: 0 !important;
      height: 0 !important;
      line-height: 0 !important;
      font-size: 0 !important;
    }

    :host ::ng-deep .mat-calendar-table-header th {
      font-size: var(--font-size-small);
      font-weight: 500;
      color: var(--color-text-tertiary);
      padding: var(--spacing-x2) 0;
      text-align: center;
    }

    :host ::ng-deep .mat-calendar-table-header-divider {
      display: none;
    }

    :host ::ng-deep .mat-calendar-body-cell {
      height: 90%;
      width: 90%;
    }

    :host ::ng-deep .mat-calendar-body-cell-content {
      font-size: var(--font-size-small) !important;
      font-weight: 400;
      color: var(--color-text-tertiary) !important;
      border-radius: var(--spacing-x2) !important;
      top: 7.5% !important;
      left: 7.5% !important;
      width: 85% !important;
      height: 85% !important;
      line-height: 1 !important;
    }

    :host ::ng-deep .has-issue .mat-calendar-body-cell-content {
      background-color: var(--accessibility-public-bg) !important;
      color: var(--accessibility-public-text-color) !important;
      border-radius: var(--spacing-x2) !important;
      font-weight: 500;
    }

    :host ::ng-deep .has-issue.accessibility-private .mat-calendar-body-cell-content {
      background-color: var(--accessibility-private-bg) !important;
      color: var(--accessibility-private-text-color) !important;
    }

    /* Issue count dots — on the cell so they don't move on hover */
    :host ::ng-deep .mat-calendar-body-cell.multiple-issues.issue-count-2::after {
      content: '••';
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translateX(-50%);
      font-size: calc(10px * var(--accessibility-text-scale, 1));
      line-height: 1;
      color: var(--accessibility-public-text-color);
      letter-spacing: 1px;
      pointer-events: none;
      z-index: 1;
    }

    :host ::ng-deep .mat-calendar-body-cell.multiple-issues.issue-count-3plus::after {
      content: '•••';
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translateX(-50%);
      font-size: calc(10px * var(--accessibility-text-scale, 1));
      line-height: 1;
      color: var(--accessibility-public-text-color);
      letter-spacing: 1px;
      pointer-events: none;
      z-index: 1;
    }

    :host ::ng-deep .mat-calendar-body-cell.has-issue.accessibility-private::after {
      color: var(--accessibility-private-text-color) !important;
    }

    :host ::ng-deep .has-issue:hover .mat-calendar-body-cell-content {
      filter: brightness(0.95);
    }

    :host ::ng-deep .mat-calendar-body-selected {
      background-color: transparent !important;
      box-shadow: none !important;
    }

    :host ::ng-deep .mat-calendar-body-active > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected) {
      background-color: transparent !important;
    }

    :host ::ng-deep .mat-calendar-body-cell:not(.mat-calendar-body-disabled):hover > .mat-calendar-body-cell-content:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
      background-color: var(--color-bg-light) !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }

    :host ::ng-deep .has-issue:not(.mat-calendar-body-disabled):hover > .mat-calendar-body-cell-content {
      background-color: var(--accessibility-public-bg) !important;
      filter: brightness(0.95);
    }

    :host ::ng-deep .has-issue.accessibility-private:not(.mat-calendar-body-disabled):hover > .mat-calendar-body-cell-content {
      background-color: var(--accessibility-private-bg) !important;
    }

    :host ::ng-deep .mat-calendar-body-today:not(.mat-calendar-body-selected):not(.mat-calendar-body-comparison-identical) {
      border-color: transparent !important;
    }

    /* Preselected date — fill the full cell */
    :host ::ng-deep .mat-calendar-body-cell.preselected-date .mat-calendar-body-cell-content {
      background-color: var(--color-primary) !important;
      color: white !important;
      top: 0 !important;
      left: 0 !important;
      width: 100% !important;
      height: 100% !important;
    }

    :host ::ng-deep .mat-calendar-body-cell.preselected-date:hover .mat-calendar-body-cell-content {
      background-color: var(--color-primary) !important;
    }

    :host ::ng-deep .mat-calendar-body-cell.preselected-date.has-issue .mat-calendar-body-cell-content::after {
      color: white !important;
    }
  `,
})
export class CalendarPopupComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  private adapter = inject(DateAdapter);
  private translate = inject(TranslateService);
  private recordHandler = inject(RecordHandlerService);
  private store = inject(Store);
  private cdr = inject(ChangeDetectorRef);

  @Input() year!: string;
  @Input() preselectedDate?: string;
  @Output() dateSelected = new EventEmitter<{ pid: string, year: number }>();
  @Output() closePopup = new EventEmitter<void>();

  // Current view state
  currentMonth = signal(0);
  currentYear = signal(2024);
  currentDate = signal(new Date());
  isLoadingCalendar = signal(false);
  isOpen = false;

  // Data map for current month only
  issueMap = signal(new Map<string, { pid: string; accessibility: string, licenses: string[] }[]>());

  // Always lazy load
  currentMonthIssues = signal<any[]>([]);


  private destroy$ = new Subject<void>();
  private loadingTimeouts = new Map<string, any>();

  @ViewChild(MatCalendar) calendar!: MatCalendar<Date>;

  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  constructor() {
    // Init date locale
    this.adapter.setLocale(this.translate.currentLang);
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => this.adapter.setLocale(e.lang));

    // Set up reactive data loading for current month
    this.setupReactiveDataLoading();
  }

  ngOnInit(): void {
    // Set calendar as open after a small delay to prevent immediate close from click-outside
    setTimeout(() => {
      this.isOpen = true;
    }, 0);
  }

  ngAfterViewInit(): void {
    // Calendar ViewChild is now available
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Handle year changes (including initial setup)
    if (changes['year'] && this.year) {
      const yearNum = parseInt(this.year, 10);
      this.currentYear.set(yearNum);

      // Check if we have a preselected date to determine the starting month
      let startingMonth = 0; // Default to January
      if (this.preselectedDate) {
        const preselectedDateObj = this.parseDate(this.preselectedDate);
        if (preselectedDateObj && preselectedDateObj.getFullYear() === yearNum) {
          startingMonth = preselectedDateObj.getMonth();
        }
      }

      this.currentMonth.set(startingMonth);
      this.updateCurrentDate();
      this.loadCurrentMonthIssues();
      return; // Early return to avoid duplicate processing
    }

    // Handle preselected date changes (only if year didn't change)
    if (changes['preselectedDate'] && this.preselectedDate) {
      console.log('Preselected date changed:', this.preselectedDate);
      this.updateCalendarToPreselectedDate();
    }
  }

  private updateCurrentDate(): void {
    const date = new Date(this.currentYear(), this.currentMonth(), 1);
    this.currentDate.set(date);
    console.log(`Updated current date to: ${date.toISOString().split('T')[0]}`);
  }

  private updateCalendarToPreselectedDate(): void {
    if (!this.preselectedDate) return;

    const preselectedDateObj = this.parseDate(this.preselectedDate);
    if (preselectedDateObj) {
      const newMonth = preselectedDateObj.getMonth();
      const newYear = preselectedDateObj.getFullYear();

      if (newMonth !== this.currentMonth() || newYear !== this.currentYear()) {
        this.isLoadingCalendar.set(true);
        this.currentMonth.set(newMonth);
        this.currentYear.set(newYear);
        this.updateCurrentDate();
        this.loadCurrentMonthIssues(); // Lazy load the new month
      } else {
        setTimeout(() => {
          if (this.calendar) {
            this.calendar.updateTodaysDate();
          }
          this.refreshCalendar();
        }, 0);
      }
    }
  }

  previousMonth(): void {
    const currentM = this.currentMonth();
    const currentY = this.currentYear();

    if (currentM === 0) {
      this.currentMonth.set(11);
      this.currentYear.set(currentY - 1);
    } else {
      this.currentMonth.set(currentM - 1);
    }
    this.updateCurrentDate();
    this.navigateCalendar();
    this.loadCurrentMonthIssues();
  }

  nextMonth(): void {
    const currentM = this.currentMonth();
    const currentY = this.currentYear();

    if (currentM === 11) {
      this.currentMonth.set(0);
      this.currentYear.set(currentY + 1);
    } else {
      this.currentMonth.set(currentM + 1);
    }
    this.updateCurrentDate();
    this.navigateCalendar();
    this.loadCurrentMonthIssues();
  }

  private navigateCalendar(): void {
    // Programmatically navigate the Material Calendar to the current month/year
    if (this.calendar) {
      this.calendar.activeDate = new Date(this.currentYear(), this.currentMonth(), 1);
      // Force the calendar to update its view
      this.cdr.detectChanges();
    }
  }

  private refreshCalendar(): void {
    // Force change detection to update calendar display
    this.cdr.detectChanges();
  }


  // Utility: parse date from DD.MM.YYYY
  parseDate(str: string): Date | null {
    const [day, month, year] = str.split('.').map(Number);
    return day && month && year ? new Date(year, month - 1, day) : null;
  }

  formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  }


  dateClass = (date: Date): string => {
    const dateKey = this.formatDateKey(date);
    let classes = '';

    // Check if this is the preselected date
    if (this.preselectedDate) {
      const preselectedDateObj = this.parseDate(this.preselectedDate);
      if (preselectedDateObj && this.formatDateKey(preselectedDateObj) === dateKey) {
        classes += ' preselected-date';
      }
    }

    // Get current issues from the issueMap signal
    const currentIssueMap = this.issueMap();
    const issues = currentIssueMap.get(dateKey);

    if (issues && issues.length > 0) {
      const hasLockedIssue = issues.some(issue =>
        this.recordHandler.isRecordLocked(issue.licenses || []),
      );

      classes += ' has-issue';
      if (issues.length > 1) {
        classes += ' multiple-issues';
        if (issues.length === 2) {
          classes += ' issue-count-2';
        } else {
          classes += ' issue-count-3plus';
        }
      }
      classes += ` accessibility-${hasLockedIssue ? 'private' : 'public'}`;
    }

    return classes.trim();
  };

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const issues = this.issueMap().get(this.formatDateKey(date));
    if (issues && issues.length > 0) {
      this.dateSelected.emit({
        pid: issues[0].pid,
        year: date.getFullYear()
      });
    }
  }

  close(): void {
    if (!this.isOpen) return;
    this.isOpen = false;
    this.closePopup.emit();
  }

  onMonthYearChange(change: MonthYearChange): void {
    this.currentMonth.set(change.month);
    this.currentYear.set(change.year);
    this.updateCurrentDate();
    this.navigateCalendar();
    this.loadCurrentMonthIssues();
  }


  private setupReactiveDataLoading(): void {
    // Much simpler approach: just listen to the entire periodical state
    // but add a flag to prevent duplicate processing
    this.store.select(selectPeriodicalState)
      .pipe(
        takeUntil(this.destroy$),
        distinctUntilChanged((prev, curr) => {
          // Only trigger if monthIssues actually changed
          return JSON.stringify(prev?.monthIssues) === JSON.stringify(curr?.monthIssues);
        })
      )
      .subscribe((state) => {
        // Only process if we're currently loading
        if (state?.monthIssues && this.isLoadingCalendar()) {
          console.log('Reactive data loading triggered');
          this.updateCurrentMonthFromStore();
        }
      });
  }

  private updateCurrentMonthFromStore(): void {
    const year = this.currentYear();
    const month = this.currentMonth() + 1;

    // Get the current data from store (synchronously)
    let currentData: any[] = [];
    this.store.select(selectMonthIssues(year, month))
      .pipe(take(1))
      .subscribe(issues => {
        currentData = issues as any[];
      });

    // Always clear loading state when data arrives, even if empty
    console.log(`Found ${currentData.length} issues in store for ${year}-${month}, updating calendar`);

    if (currentData.length > 0) {
      this.currentMonthIssues.set(currentData);
      this.updateIssueMapForMonth(currentData);
    } else {
      this.issueMap.set(new Map())
    }
    this.isLoadingCalendar.set(false);

  }


  // Always lazy load current month
  loadCurrentMonthIssues(): void {

    const year = this.currentYear();
    const month = this.currentMonth() + 1; // Convert 0-based to 1-based month
    const monthKey = `${year}-${month}`;

    // Clear any existing timeout for this month
    if (this.loadingTimeouts.has(monthKey)) {
      clearTimeout(this.loadingTimeouts.get(monthKey));
    }

    // Set loading state
    this.isLoadingCalendar.set(true);

    // Debounce the loading to prevent rapid calls
    const timeoutId = setTimeout(() => {
      this.loadingTimeouts.delete(monthKey);

      // Get current state and dispatch if needed
      this.store.select(selectPidFromAvailableYears(year.toString())).pipe(take(1)).subscribe(volumeUuid => {
        const uuid = volumeUuid as string;

        if (!uuid) {
          console.warn(`No volume UUID found for year ${year}`);
          this.isLoadingCalendar.set(false);
          return;
        }

        // Check current state by looking at the raw store data
        this.store.select(selectPeriodicalState).pipe(take(1)).subscribe(state => {
          const monthKey = `${year}-${String(month).padStart(2, '0')}`;
          const monthIssues = state?.monthIssues[monthKey];
          const isLoading = !!state?.monthLoading[monthKey];
          const hasBeenLoaded = monthKey in (state?.monthIssues || {});

          console.log(`Month ${year}-${month}: hasBeenLoaded=${hasBeenLoaded}, issues=${monthIssues?.length || 0}, loading=${isLoading}`);

          if (!hasBeenLoaded && !isLoading) {
            // No data cached and not loading - dispatch new request
            console.log(`Dispatching loadMonthIssues for ${year}-${month}`);
            this.store.dispatch(loadMonthIssues({
              parentVolumeUuid: uuid,
              year,
              month,
            }));
            // Keep loading state - it will be cleared when data arrives via reactive subscription
          } else {
            // Data already exists or is loading, clear loading state
            this.isLoadingCalendar.set(false);

            if (monthIssues && monthIssues.length > 0) {
              // Update calendar with existing issues
              this.currentMonthIssues.set(monthIssues);
              this.updateIssueMapForMonth(monthIssues);
            } else {
              // Clear calendar for empty month (including cached empty data)
              this.currentMonthIssues.set([]);
              this.issueMap.set(new Map());
            }
          }
        });
      });
    }, 100); // 100ms debounce

    this.loadingTimeouts.set(monthKey, timeoutId);
  }

  private updateIssueMapForMonth(items: any[]): void {
    const map = new Map<string, { pid: string; accessibility: string, licenses: string[] }[]>();

    for (const item of items) {
      const date = this.parseDate(item['date.str']);
      if (!date || !item.pid) continue;

      const key = this.formatDateKey(date);
      const issueData = {
        pid: item.pid,
        accessibility: item.accessibility || 'private',
        licenses: item.licenses || [],
      };

      if (map.has(key)) {
        map.get(key)!.push(issueData);
      } else {
        map.set(key, [issueData]);
      }
    }

    this.issueMap.set(map);

    // Force calendar to update its date classes
    setTimeout(() => {
      if (this.calendar) {
        this.calendar.updateTodaysDate();
      }
      this.refreshCalendar();
    }, 20);
  }

  ngOnDestroy(): void {
    // Clear all pending timeouts
    this.loadingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.loadingTimeouts.clear();

    this.destroy$.next();
    this.destroy$.complete();
  }

}
