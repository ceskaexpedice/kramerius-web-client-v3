import {Component, inject, Input} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';
import {HttpClient} from '@angular/common/http';
import {DateAdapter} from '@angular/material/core';
import {NgForOf} from '@angular/common';
import {Store} from '@ngrx/store';
import {selectPeriodicalChildren} from '../../state/periodical-detail.selectors';
import {Router} from '@angular/router';
import {APP_ROUTES_ENUM} from '../../../../app.routes';

@Component({
  selector: 'app-periodical-year-issues-calendar',
  imports: [
    MatCalendar,
    NgForOf,
  ],
  templateUrl: './periodical-year-issues-calendar.component.html',
  styleUrl: './periodical-year-issues-calendar.component.scss'
})
export class PeriodicalYearIssuesCalendarComponent {
  @Input() year!: string;
  @Input() pid!: string;

  selectedDate: Date | null = null;
  availableDates: Date[] = [];
  yearNum: number = 0;

  // Array for 12 months (0-11)
  months = Array(12).fill(0).map((_, i) => i);

  // Month names in Slovak
  monthNames = [
    'Január', 'Február', 'Marec', 'Apríl', 'Máj', 'Jún',
    'Júl', 'August', 'September', 'Október', 'November', 'December'
  ];

  issueMap = new Map<string, string>(); // "YYYY-MM-DD" => pid

  private store = inject(Store);
  private router = inject(Router);

  children$ = this.store.select(selectPeriodicalChildren);

  constructor(
    private dateAdapter: DateAdapter<Date>,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.yearNum = parseInt(this.year);
    this.selectedDate = new Date(this.yearNum, 0, 1);

    this.children$.subscribe(items => {
      const map = new Map<string, string>();
      items.forEach((item: any) => {
        const date = this.parseDate(item['date.str']);
        if (date && item.pid) {
          const key = this.formatDateKey(date);
          map.set(key, item.pid);
        }
      });
      this.issueMap = map;

      // Pre dateClass
      this.availableDates = Array.from(map.keys()).map(d => new Date(d));
    });
  }

  formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  parseDate(dateStr: string): Date | null {
    const [day, month, year] = dateStr.split('.').map(part => parseInt(part, 10));
    if (!day || !month || !year) return null;

    return new Date(year, month - 1, day);
  }

  // Get a date object for the first day of a specific month
  getMonthDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex, 1);
  }

  // Get min date for a specific month (first day of the month)
  getMonthMinDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex, 1);
  }

  // Get max date for a specific month (last day of the month)
  getMonthMaxDate(monthIndex: number): Date {
    return new Date(this.yearNum, monthIndex + 1, 0);
  }

  // Custom date class function to highlight dates with issues
  dateClass = (date: Date): string => {
    return this.availableDates.some(d =>
      d.getFullYear() === date.getFullYear() &&
      d.getMonth() === date.getMonth() &&
      d.getDate() === date.getDate()
    ) ? 'has-issue' : '';
  };

  onDateSelected(date: Date | null) {
    if (!date) return;

    const key = this.formatDateKey(date);
    const pid = this.issueMap.get(key);

    if (pid) {
      this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW], {
        queryParams: { page: pid },
        queryParamsHandling: 'merge',
      });
    }
  }



}
