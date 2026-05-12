import {
  Component,
  computed,
  inject,
  Input,
  OnChanges,
  OnDestroy,
  QueryList,
  signal,
  SimpleChanges,
  ViewChildren,
} from '@angular/core';
import { MatCalendar } from '@angular/material/datepicker';
import { NgForOf, NgIf } from '@angular/common';
import { Store } from '@ngrx/store';
import { selectPeriodicalChildren } from '../../state/periodical-detail/periodical-detail.selectors';
import { Router } from '@angular/router';
import { DateAdapter, MAT_DATE_LOCALE } from '@angular/material/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PeriodicalService } from '../../../../shared/services/periodical.service';
import { RecordHandlerService } from '../../../../shared/services/record-handler.service';
import { RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { DocumentTypeEnum } from '../../../constants/document-type';
import { PopupPositioningService, PopupState } from '../../../../shared/services/popup-positioning.service';
import { normalizeIssueTypeCode } from '../../../../shared/utils/issue-type-code';
import { PeriodicalDayIssuesPopupComponent } from '../periodical-day-issues-popup/periodical-day-issues-popup.component';

interface CalendarIssue {
  pid: string;
  accessibility: string;
  licenses: string[];
  model: string;
  partNumber?: string;
  issueTypeCode?: string;
  dateStr?: string;
  dateRangeEndDay?: number;
  dateRangeEndMonth?: number;
}

@Component({
  selector: 'app-periodical-year-issues-calendar',
  imports: [
    MatCalendar,
    NgForOf,
    NgIf,
    TranslatePipe,
    PeriodicalDayIssuesPopupComponent,
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
export class PeriodicalYearIssuesCalendarComponent implements OnChanges, OnDestroy {
  private store = inject(Store);
  private router = inject(Router);
  private adapter = inject(DateAdapter);
  private translate = inject(TranslateService);
  public periodicalService = inject(PeriodicalService);
  private recordHandler = inject(RecordHandlerService);
  private popupPositioningService = inject(PopupPositioningService);

  @Input() year!: string;
  @Input() pid!: string;

  yearNum = 0;
  selectedDate: Date | null = null;
  shouldShowCalendars = signal(true);

  issueMap = signal(new Map<string, CalendarIssue[]>());

  // Popup state for multi-issue cells (managed by PopupPositioningService)
  popupIssues = signal<CalendarIssue[]>([]);
  popupRecordItems = computed<RecordItem[]>(() => this.popupIssues().map(issue => this.toRecordItem(issue)));
  issuesPopupState: PopupState = this.popupPositioningService.createPopupState();
  private pendingClickEvent: Event | null = null;

  // Lazy loading state
  monthlyIssueMap = signal(new Map<number, CalendarIssue[]>());
  visibleMonths = signal(new Set<number>([0, 1, 2])); // Initially show first 3 months
  lazyLoadingEnabled = signal(false);

  months = Array.from({ length: 12 }, (_, i) => i);
  monthNames = [
    'months.january', 'months.february', 'months.march', 'months.april', 'months.may', 'months.june',
    'months.july', 'months.august', 'months.september', 'months.october', 'months.november', 'months.december',
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
    const map = new Map<string, CalendarIssue[]>();

    for (const item of items) {
      const date = this.parseDate(item['date.str']);
      if (!date || !item.pid) continue;

      const key = this.formatDateKey(date);
      const issueData: CalendarIssue = {
        pid: item.pid,
        accessibility: item.accessibility || 'private',
        licenses: item['licenses.facet'] || item.licenses || [],
        model: item.model,
        partNumber: item['part.number.str'],
        issueTypeCode: normalizeIssueTypeCode(item['issue.type.code']),
        dateStr: item['date.str'],
        dateRangeEndDay: item['date_range_end.day'],
        dateRangeEndMonth: item['date_range_end.month'],
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
      !this.recordHandler.isRecordPublic(issue.licenses || [])
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
    if (!issues || issues.length === 0) return;

    if (issues.length > 1) {
      this.popupIssues.set(issues);
      const triggerEvent = this.pendingClickEvent
        ? this.synthesizeCellTrigger(this.pendingClickEvent)
        : undefined;
      this.popupPositioningService.showPopup(
        this.issuesPopupState,
        {
          triggerEvent,
          preferredSide: 'right',
          offsetY: 4,
        },
        '.issues-popup-wrapper',
      );
      return;
    }

    this.periodicalService.onCalendarDateSelected(issues[0].pid);
  }

  onCalendarClick(event: MouseEvent): void {
    this.pendingClickEvent = event;
  }

  closePopup(): void {
    this.issuesPopupState.closePopup();
    this.popupIssues.set([]);
  }

  // PopupPositioningService positions relative to event.target. For mat-calendar clicks,
  // the target is often an inner span; align the popup to the full cell instead.
  private synthesizeCellTrigger(event: Event): Event {
    const target = event.target as HTMLElement | null;
    const cell = target?.closest('.mat-calendar-body-cell') as HTMLElement | null;
    if (!cell) return event;
    return { ...event, target: cell } as unknown as Event;
  }

  toRecordItem(issue: CalendarIssue): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    let title = '';
    let subtitle = issue.partNumber ? `${subtitlePrefix} ${issue.partNumber}` : '';
    subtitle = issue.dateStr ?? '';
    if (issue.issueTypeCode) {
      title = this.translate.instant(`${issue.issueTypeCode}-issue`);
    } else if (issue.dateRangeEndDay && issue.dateRangeEndMonth) {
      title = `${issue.dateRangeEndDay}.${issue.dateRangeEndMonth}`;
    } else if (issue.partNumber) {
      title = `${subtitlePrefix} ${issue.partNumber}`;
    }
    return {
      id: issue.pid,
      title,
      subtitle,
      model: issue.model as DocumentTypeEnum,
      licenses: issue.licenses || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true,
    };
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
      const issueData: CalendarIssue = {
        pid: item.pid,
        accessibility: item.accessibility || 'private',
        licenses: item['licenses.facet'] || item.licenses || [],
        model: item.model,
        partNumber: item['part.number.str'],
        issueTypeCode: normalizeIssueTypeCode(item['issue.type.code']),
        dateStr: item['date.str'],
        dateRangeEndDay: item['date_range_end.day'],
        dateRangeEndMonth: item['date_range_end.month'],
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

  ngOnDestroy(): void {
    this.popupPositioningService.cleanup();
  }
}
