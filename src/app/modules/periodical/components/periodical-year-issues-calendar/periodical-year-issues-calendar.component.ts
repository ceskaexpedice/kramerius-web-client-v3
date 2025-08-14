import {
  AfterViewInit,
  Component,
  inject,
  Input,
  OnChanges,
  QueryList,
  signal,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';
import {NgForOf, NgIf} from '@angular/common';
import {Store} from '@ngrx/store';
import {selectPeriodicalChildren} from '../../state/periodical-detail/periodical-detail.selectors';
import {Router} from '@angular/router';
import {APP_ROUTES_ENUM} from '../../../../app.routes';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {PeriodicalService} from '../../../../shared/services/periodical.service';
import {RecordHandlerService} from '../../../../shared/services/record-handler.service';

@Component({
  selector: 'app-periodical-year-issues-calendar',
  imports: [
    MatCalendar,
    NgForOf,
    NgIf,
  ],
  providers: [
    {
      provide: MAT_DATE_LOCALE,
      useFactory: (translate: TranslateService) => translate.currentLang,
      deps: [TranslateService],
    },
  ],
  templateUrl: './periodical-year-issues-calendar.component.html',
  styleUrl: './periodical-year-issues-calendar.component.scss'
})
export class PeriodicalYearIssuesCalendarComponent implements OnChanges {
  private store = inject(Store);
  private router = inject(Router);
  private adapter = inject(DateAdapter);
  private translate = inject(TranslateService);
  public periodicalService = inject(PeriodicalService);
  private recordHandler = inject(RecordHandlerService);

  @Input() year!: string;
  @Input() pid!: string;

  yearNum = 0;
  selectedDate: Date | null = null;
  shouldShowCalendars = signal(true);

  issueMap = signal(new Map<string, { pid: string; accessibility: string, licenses: string[] }[]>());

  // Lazy loading state
  monthlyIssueMap = signal(new Map<number, { pid: string; accessibility: string, licenses: string[] }[]>());
  visibleMonths = signal(new Set<number>([0, 1, 2])); // Initially show first 3 months
  lazyLoadingEnabled = signal(false);

  months = Array.from({ length: 12 }, (_, i) => i);
  monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December',
  ];

  @ViewChildren(MatCalendar) calendars!: QueryList<MatCalendar<Date>>;

  constructor() {
    // Init date locale
    this.adapter.setLocale(this.translate.currentLang);
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(e => this.adapter.setLocale(e.lang));

    // Listen to children and populate map
    this.store.select(selectPeriodicalChildren)
      .pipe(takeUntilDestroyed())
      .subscribe(items => {
        this.updateIssueMap(items);
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && this.year) {
      this.yearNum = parseInt(this.year, 10);
      this.selectedDate = new Date(this.yearNum, 0, 1);
    }
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

    this.shouldShowCalendars.set(false);

    setTimeout(() => {
      this.shouldShowCalendars.set(true);
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

  getMonthDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex, 1);
  }

  getMonthMinDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex, 1);
  }

  getMonthMaxDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex + 1, 0);
  }

  dateClass = (date: Date): string => {
    const issues = this.issueMap().get(this.formatDateKey(date));
    if (!issues || issues.length === 0) return '';

    const hasLockedIssue = issues.some(issue =>
      this.recordHandler.isRecordLocked(issue.licenses || [])
    );

    let classes = 'has-issue';
    if (issues.length > 1) {
      classes += ' multiple-issues';
      if (issues.length === 2) {
        classes += ' issue-count-2';
      } else {
        classes += ' issue-count-3plus';
      }
    }
    classes += ` accessibility-${hasLockedIssue ? 'private' : 'public'}`;

    return classes;
  };

  getIssueCount(date: Date): number {
    const issues = this.issueMap().get(this.formatDateKey(date));
    return issues ? issues.length : 0;
  }

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const issues = this.issueMap().get(this.formatDateKey(date));
    if (issues && issues.length > 0) {
      this.periodicalService.onCalendarDateSelected(issues[0].pid);
    }
  }

  // Lazy loading methods
  loadMonthIfNeeded(monthIndex: number): void {
    if (!this.lazyLoadingEnabled() || this.visibleMonths().has(monthIndex)) {
      return;
    }

    this.periodicalService.loadMonthIssues(this.year, monthIndex + 1).subscribe(issues => {
      this.updateMonthInIssueMap(monthIndex, issues);
      this.visibleMonths.update(months => new Set([...months, monthIndex]));
    });
  }

  private updateMonthInIssueMap(monthIndex: number, items: any[]): void {
    const currentMap = new Map(this.issueMap());

    for (const item of items) {
      const date = this.parseDate(item['date.str']);
      if (!date || !item.pid || date.getMonth() !== monthIndex) continue;

      const key = this.formatDateKey(date);
      const issueData = {
        pid: item.pid,
        accessibility: item.accessibility || 'private',
        licenses: item.licenses || [],
      };

      if (currentMap.has(key)) {
        currentMap.get(key)!.push(issueData);
      } else {
        currentMap.set(key, [issueData]);
      }
    }

    this.issueMap.set(currentMap);
    this.shouldShowCalendars.set(false);
    setTimeout(() => this.shouldShowCalendars.set(true), 0);
  }

  onMonthIntersection(monthIndex: number, isIntersecting: boolean): void {
    if (isIntersecting) {
      this.loadMonthIfNeeded(monthIndex);
    }
  }

  isMonthVisible(monthIndex: number): boolean {
    return !this.lazyLoadingEnabled() || this.visibleMonths().has(monthIndex);
  }

  enableLazyLoading(): void {
    this.lazyLoadingEnabled.set(true);
    this.visibleMonths.set(new Set([0, 1, 2]));
  }

  disableLazyLoading(): void {
    this.lazyLoadingEnabled.set(false);
    this.visibleMonths.set(new Set(this.months));
  }
}
