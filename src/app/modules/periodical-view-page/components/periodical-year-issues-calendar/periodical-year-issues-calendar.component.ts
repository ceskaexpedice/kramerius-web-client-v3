import {Component, inject, Input} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';
import {Observable, of} from 'rxjs';
import {HttpClient} from '@angular/common/http';
import {DateAdapter} from '@angular/material/core';
import {NgForOf} from '@angular/common';
import {Store} from '@ngrx/store';
import {selectPeriodicalChildren} from '../../../../state/periodical-detail/periodical-detail.selectors';

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

  private store = inject(Store);
  children$ = this.store.select(selectPeriodicalChildren);

  constructor(
    private dateAdapter: DateAdapter<Date>,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.yearNum = parseInt(this.year);
    this.selectedDate = new Date(this.yearNum, 0, 1);

    this.children$.subscribe(items => {
      this.availableDates = items
        .map((i: any) => this.parseDate(i['date.str']))
        .filter((date: any): date is Date => !!date && date.getFullYear() === this.yearNum);
    });
  }

  parseDate(dateStr: string): Date | null {
    const [day, month, year] = dateStr.split('.').map(part => parseInt(part, 10));
    if (!day || !month || !year) return null;

    return new Date(year, month - 1, day); // mesiace sú 0-based
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

  onDateSelected(date: any) {
    // Handle date selection - perhaps navigate to the issue detail
    console.log('Selected date:', date);
  }



}
