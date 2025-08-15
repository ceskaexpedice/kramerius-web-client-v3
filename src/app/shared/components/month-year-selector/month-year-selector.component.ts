import {Component, EventEmitter, Input, OnInit, Output, signal} from '@angular/core';
import {SelectComponent} from '../select/select.component';
import {ENVIRONMENT} from '../../../app.config';

export interface MonthYearChange {
  month: number;
  year: number;
}

@Component({
  selector: 'app-month-year-selector',
  standalone: true,
  imports: [SelectComponent],
  template: `
    <div class="month-year-selector">
      <app-select
        [options]="monthOptions"
        [value]="selectedMonth()"
        [displayFn]="monthDisplayFn"
        [theme]="'base'"
        [filterable]="true"
        (valueChange)="onMonthChange($event)">
      </app-select>

      <app-select
        [options]="yearOptions"
        [value]="selectedYear()"
        [displayFn]="yearDisplayFn"
        [theme]="'base'"
        [filterable]="true"
        (valueChange)="onYearChange($event)">
      </app-select>
    </div>
  `,
  styles: `
    .month-year-selector {
      display: flex;
      align-items: center;
    }
  `
})
export class MonthYearSelectorComponent implements OnInit {
  @Input() month: number = 0; // 0-based month
  @Input() year: number = new Date().getFullYear();
  @Output() monthYearChange = new EventEmitter<MonthYearChange>();

  selectedMonth = signal<{value: number, label: string} | null>(null);
  selectedYear = signal<{value: number, label: string} | null>(null);

  monthOptions: {value: number, label: string}[] = [
    { value: 0, label: 'January' },
    { value: 1, label: 'February' },
    { value: 2, label: 'March' },
    { value: 3, label: 'April' },
    { value: 4, label: 'May' },
    { value: 5, label: 'June' },
    { value: 6, label: 'July' },
    { value: 7, label: 'August' },
    { value: 8, label: 'September' },
    { value: 9, label: 'October' },
    { value: 10, label: 'November' },
    { value: 11, label: 'December' }
  ];

  yearOptions: {value: number, label: string}[] = [];

  ngOnInit() {
    this.generateYearOptions();
    this.setInitialValues();
  }

  private generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const startYear = ENVIRONMENT.dateRangeStartYear;

    this.yearOptions = [];
    for (let year = startYear; year <= currentYear; year++) {
      this.yearOptions.push({
        value: year,
        label: year.toString()
      });
    }

    // Reverse to show newest years first
    this.yearOptions.reverse();
  }

  private setInitialValues() {
    const monthOption = this.monthOptions.find(m => m.value === this.month);
    const yearOption = this.yearOptions.find(y => y.value === this.year);

    this.selectedMonth.set(monthOption || this.monthOptions[0]);
    this.selectedYear.set(yearOption || this.yearOptions[0]);
  }

  onMonthChange(monthOption: {value: number, label: string}) {
    this.selectedMonth.set(monthOption);
    this.emitChange();
  }

  onYearChange(yearOption: {value: number, label: string}) {
    this.selectedYear.set(yearOption);
    this.emitChange();
  }

  private emitChange() {
    const month = this.selectedMonth();
    const year = this.selectedYear();

    if (month && year) {
      this.monthYearChange.emit({
        month: month.value,
        year: year.value
      });
    }
  }

  monthDisplayFn = (option: {value: number, label: string} | null) => option ? option.label : '';
  yearDisplayFn = (option: {value: number, label: string} | null) => option ? option.label : '';
}
