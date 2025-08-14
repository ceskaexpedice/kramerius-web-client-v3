import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';
import {NgIf} from '@angular/common';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import {RecordHandlerService} from '../../services/record-handler.service';
import {Store} from '@ngrx/store';
import {loadMonthIssues} from '../../../modules/periodical/state/periodical-detail/periodical-detail.actions';
import {
  selectMonthIssues,
  selectMonthLoading,
  selectPidFromAvailableYears,
} from '../../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import {Subject, take} from 'rxjs';
import {takeUntil} from 'rxjs/operators';

@Component({
  selector: 'app-calendar-popup',
  imports: [
    MatCalendar,
    NgIf,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useFactory: (translate: TranslateService) => translate.currentLang,
      deps: [TranslateService],
    },
  ],
  template: `
    <div class="calendar-dropdown">
      <div class="calendar-popup-header">
        <button class="nav-btn" (click)="previousMonth()">
          <i class="icon-arrow-left-1"></i>
        </button>
        <h3>{{ monthNames[currentMonth()] }} {{ currentYear() }}</h3>
        <button class="nav-btn" (click)="nextMonth()">
          <i class="icon-arrow-right-1"></i>
        </button>
        <button class="close-btn" (click)="close()">×</button>
      </div>
      <div class="single-calendar-container" *ngIf="shouldShowCalendar()">
        <mat-calendar
          class="custom-label"
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
      z-index: 1000;
      margin-top: 4px;
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
      font-size: 18px;
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
      font-size: 20px;
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

    .single-calendar-container {
      padding: 20px;
      display: flex;
      justify-content: center;
    }

    :host ::ng-deep .mat-calendar {
      width: 100%;
    }

    :host ::ng-deep .has-issue {
      border-radius: 15%;
    }

    /* Preselected date styling */
    :host ::ng-deep .mat-calendar-body-cell.preselected-date {
      background-color: var(--color-primary) !important;
      color: white !important;
    }

    :host ::ng-deep .mat-calendar-body-cell.preselected-date .mat-calendar-body-cell-content {
      color: white !important;
    }

    :host ::ng-deep .mat-calendar-body-cell.preselected-date:hover {
      background-color: var(--color-primary) !important;
    }

    /* Single dot for single issue */
    :host ::ng-deep .mat-calendar-body-cell.has-issue:not(.multiple-issues)::after {
      content: '•';
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      color: var(--color-text-btn-tertiary-default);
    }

    /* Two dots for 2 issues */
    :host ::ng-deep .mat-calendar-body-cell.multiple-issues.issue-count-2::after {
      content: '••';
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      color: var(--color-text-btn-tertiary-default);
      letter-spacing: 1px;
    }

    /* Three dots for 3+ issues */
    :host ::ng-deep .mat-calendar-body-cell.multiple-issues.issue-count-3plus::after {
      content: '•••';
      position: absolute;
      top: 65%;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      color: var(--color-text-btn-tertiary-default);
      letter-spacing: 1px;
    }

    /* Dots on preselected dates should be white for visibility */
    :host ::ng-deep .mat-calendar-body-cell.preselected-date.has-issue::after {
      color: white !important;
    }
  `
})
export class CalendarPopupComponent implements OnChanges, OnDestroy {
  private adapter = inject(DateAdapter);
  private translate = inject(TranslateService);
  private recordHandler = inject(RecordHandlerService);
  private store = inject(Store);

  @Input() year!: string;
  @Input() periodicalChildren: any[] = [];
  @Input() preselectedDate?: string;
  @Output() dateSelected = new EventEmitter<string>();
  @Output() closePopup = new EventEmitter<void>();

  // Current view state
  currentMonth = signal(0);
  currentYear = signal(2024);
  currentDate = signal(new Date());
  shouldShowCalendar = signal(true);

  // Data map for all issues across all years
  issueMap = signal(new Map<string, { pid: string; accessibility: string, licenses: string[] }[]>());

  // Lazy loading for single month view
  lazyLoadingEnabled = signal(true); // Enable by default
  currentMonthIssues = signal<any[]>([]);
  isLoadingCurrentMonth = signal(false);
  
  private destroy$ = new Subject<void>();
  private loadingTimeouts = new Map<string, any>();

  monthNames: string[] = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  constructor() {
    // Init date locale
    this.adapter.setLocale(this.translate.currentLang);
    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(e => this.adapter.setLocale(e.lang));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && this.year) {
      const yearNum = parseInt(this.year, 10);
      this.currentYear.set(yearNum);
      this.currentMonth.set(0); // Start with January
      this.updateCurrentDate();

      // Load the initial month when year changes
      this.loadCurrentMonthIssues();
    }
    if (changes['periodicalChildren'] && this.periodicalChildren) {
      this.updateIssueMap(this.periodicalChildren);
    }
    if (changes['preselectedDate'] && this.preselectedDate) {
      this.updateCalendarToPreselectedDate();
    }
  }

  private updateCurrentDate(): void {
    const date = new Date(this.currentYear(), this.currentMonth(), 1);
    this.currentDate.set(date);
  }

  private updateCalendarToPreselectedDate(): void {
    if (!this.preselectedDate) return;

    const preselectedDateObj = this.parseDate(this.preselectedDate);
    if (preselectedDateObj) {
      this.currentMonth.set(preselectedDateObj.getMonth());
      this.currentYear.set(preselectedDateObj.getFullYear());
      this.updateCurrentDate();
      this.refreshCalendar();
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
    this.loadCurrentMonthIssues();
    this.refreshCalendar();
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
    this.loadCurrentMonthIssues();
    this.refreshCalendar();
  }

  private refreshCalendar(): void {
    // Force calendar re-render by toggling visibility
    this.shouldShowCalendar.set(false);
    setTimeout(() => {
      this.shouldShowCalendar.set(true);
    }, 0);
  }

  private updateIssueMap(items: any[]): void {
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

    this.shouldShowCalendar.set(false);
    setTimeout(() => {
      this.shouldShowCalendar.set(true);
    }, 0);
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

    // Check for issues
    const issues = this.issueMap().get(dateKey);
    if (issues && issues.length > 0) {
      const hasLockedIssue = issues.some(issue =>
        this.recordHandler.isRecordLocked(issue.licenses || [])
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
      this.dateSelected.emit(issues[0].pid);
    }
  }

  close(): void {
    this.closePopup.emit();
  }


  // Lazy loading methods for calendar popup
  loadCurrentMonthIssues(): void {
    if (!this.lazyLoadingEnabled()) return;

    const year = this.currentYear();
    const month = this.currentMonth() + 1; // Convert 0-based to 1-based month
    const monthKey = `${year}-${month}`;
    
    // Clear any existing timeout for this month
    if (this.loadingTimeouts.has(monthKey)) {
      clearTimeout(this.loadingTimeouts.get(monthKey));
    }
    
    // Debounce the loading to prevent rapid calls
    const timeoutId = setTimeout(() => {
      this.loadingTimeouts.delete(monthKey);
      
      // Get current state and dispatch if needed
      this.store.select(selectPidFromAvailableYears(year.toString())).pipe(take(1)).subscribe(volumeUuid => {
        const uuid = volumeUuid as string;
        
        if (!uuid) {
          console.warn(`No volume UUID found for year ${year}`);
          return;
        }

        // Check current state
        this.store.select(selectMonthIssues(year, month)).pipe(take(1)).subscribe(issues => {
          const monthIssues = issues as any[];
          
          this.store.select(selectMonthLoading(year, month)).pipe(take(1)).subscribe(loading => {
            const isLoading = loading as boolean;
            
            console.log(`Month ${year}-${month}: issues=${monthIssues.length}, loading=${isLoading}`);
            
            // Only dispatch if we don't have data and aren't loading
            if (monthIssues.length === 0 && !isLoading) {
              console.log(`Dispatching loadMonthIssues for ${year}-${month}`);
              this.store.dispatch(loadMonthIssues({
                parentVolumeUuid: uuid,
                year,
                month
              }));
            } else if (monthIssues.length > 0) {
              // Update calendar with existing issues
              this.currentMonthIssues.set(monthIssues);
              this.updateIssueMapForMonth(monthIssues);
            }
          });
        });
      });
    }, 100); // 100ms debounce
    
    this.loadingTimeouts.set(monthKey, timeoutId);
  }

  private updateIssueMapForMonth(items: any[]): void {
    const map = new Map(this.issueMap());

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
    this.refreshCalendar();
  }

  ngOnDestroy(): void {
    // Clear all pending timeouts
    this.loadingTimeouts.forEach(timeoutId => clearTimeout(timeoutId));
    this.loadingTimeouts.clear();
    
    this.destroy$.next();
    this.destroy$.complete();
  }

}
