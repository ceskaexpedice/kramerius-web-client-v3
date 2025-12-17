import {Component, EventEmitter, Input, OnInit, Output, signal, inject} from '@angular/core';
import {SelectComponent} from '../select/select.component';
import {ENVIRONMENT} from '../../../app.config';
import { TranslateService } from '@ngx-translate/core';

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

      @if (showMonthNavigation) {
        <div class="month-navigation">

          <button class="button primary sm" (click)="prevMonth()">
            <i class="icon-arrow-left-3"></i>
          </button>
          <button class="button primary sm" (click)="nextMonth()">
            <i class="icon-arrow-right-3"></i>
          </button>

        </div>

      }
    </div>
  `,
  styles: `
    .month-year-selector {
      display: flex;
      align-items: center;
    }

    .month-navigation {
      display: flex;
      gap: var(--spacing-x1);
      align-items: center;
      margin-left: auto;
    }

    button {
      padding: var(--spacing-x2);
    }
  `
})
export class MonthYearSelectorComponent implements OnInit {
  private translateService = inject(TranslateService);

  @Input() month: number = 0; // 0-based month
  @Input() year: number = new Date().getFullYear();
  @Input() showMonthNavigation: boolean = false;
  @Output() monthYearChange = new EventEmitter<MonthYearChange>();

  monthOptions: {value: number, label: string}[] = [];

  yearOptions: {value: number, label: string}[] = [];

  selectedMonth = signal<{value: number, label: string}>({value: this.month, label: ''});
  selectedYear = signal<{value: number, label: string}>({value: this.year, label: this.year.toString()});

  ngOnInit() {
    this.generateMonthOptions();
    this.generateYearOptions();
    this.setInitialValues();
  }

  private generateMonthOptions() {
    this.monthOptions = [
      { value: 0, label: this.translateService.instant('months.january') },
      { value: 1, label: this.translateService.instant('months.february') },
      { value: 2, label: this.translateService.instant('months.march') },
      { value: 3, label: this.translateService.instant('months.april') },
      { value: 4, label: this.translateService.instant('months.may') },
      { value: 5, label: this.translateService.instant('months.june') },
      { value: 6, label: this.translateService.instant('months.july') },
      { value: 7, label: this.translateService.instant('months.august') },
      { value: 8, label: this.translateService.instant('months.september') },
      { value: 9, label: this.translateService.instant('months.october') },
      { value: 10, label: this.translateService.instant('months.november') },
      { value: 11, label: this.translateService.instant('months.december') }
    ];
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

  prevMonth() {
    const currentMonth = this.selectedMonth();
    if (currentMonth && this.selectedYear()) {
      const newMonthValue = (currentMonth.value - 1 + 12) % 12;
      const newYearValue = newMonthValue === 11 ? this.selectedYear().value - 1 : this.selectedYear().value;

      const newMonthOption = this.monthOptions.find(m => m.value === newMonthValue);
      const newYearOption = this.yearOptions.find(y => y.value === newYearValue);

      if (newMonthOption && newYearOption) {
        this.selectedMonth.set(newMonthOption);
        this.selectedYear.set(newYearOption);
        this.emitChange();
      }
    }
  }

  nextMonth() {
    const currentMonth = this.selectedMonth();
    if (currentMonth && this.selectedYear()) {
      const newMonthValue = (currentMonth.value + 1) % 12;
      const newYearValue = newMonthValue === 0 ? this.selectedYear().value + 1 : this.selectedYear().value;

      const newMonthOption = this.monthOptions.find(m => m.value === newMonthValue);
      const newYearOption = this.yearOptions.find(y => y.value === newYearValue);

      if (newMonthOption && newYearOption) {
        this.selectedMonth.set(newMonthOption);
        this.selectedYear.set(newYearOption);
        this.emitChange();
      }
    }
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
