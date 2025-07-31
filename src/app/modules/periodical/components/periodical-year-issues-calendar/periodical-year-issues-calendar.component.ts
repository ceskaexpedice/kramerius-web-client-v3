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
  private periodicalService = inject(PeriodicalService);

  @Input() year!: string;
  @Input() pid!: string;

  yearNum = 0;
  selectedDate: Date | null = null;
  shouldShowCalendars = signal(true);

  issueMap = signal(new Map<string, { pid: string; accessibility: string }>());

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
    const map = new Map<string, { pid: string; accessibility: string }>();

    for (const item of items) {
      const date = this.parseDate(item['date.str']);
      if (!date || !item.pid) continue;

      const key = this.formatDateKey(date);
      map.set(key, {
        pid: item.pid,
        accessibility: item.accessibility || 'private'
      });
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
    const data = this.issueMap().get(this.formatDateKey(date));
    return data ? `has-issue accessibility-${data.accessibility}` : '';
  };

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const data = this.issueMap().get(this.formatDateKey(date));
    if (data?.pid) this.periodicalService.onCalendarDateSelected(data.pid);
  }
}
