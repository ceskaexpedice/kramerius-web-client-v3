import {
  Component,
  EventEmitter,
  inject,
  Input,
  OnChanges,
  OnInit,
  Output,
  signal,
  SimpleChanges,
} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';
import {NgIf} from '@angular/common';
import {DateAdapter, MAT_DATE_LOCALE} from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {RecordHandlerService} from '../../services/record-handler.service';

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
      width: 265px;
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
  `
})
export class CalendarPopupComponent implements OnChanges {
  private adapter = inject(DateAdapter);
  private translate = inject(TranslateService);
  private recordHandler = inject(RecordHandlerService);

  @Input() year!: string;
  @Input() periodicalChildren: any[] = [];
  @Output() dateSelected = new EventEmitter<string>();
  @Output() closePopup = new EventEmitter<void>();

  // Current view state
  currentMonth = signal(0);
  currentYear = signal(2024);
  currentDate = signal(new Date());
  shouldShowCalendar = signal(true);

  // Data map for all issues across all years
  issueMap = signal(new Map<string, { pid: string; accessibility: string, licenses: string[] }>());

  constructor() {
    // Init date locale
    this.adapter.setLocale(this.translate.currentLang);
    this.translate.onLangChange
      .pipe(takeUntilDestroyed())
      .subscribe(e => this.adapter.setLocale(e.lang));
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['year'] && this.year) {
      const yearNum = parseInt(this.year, 10);
      this.currentYear.set(yearNum);
      this.currentMonth.set(0); // Start with January
      this.updateCurrentDate();
    }
    if (changes['periodicalChildren'] && this.periodicalChildren) {
      this.updateIssueMap(this.periodicalChildren);
    }
  }

  private updateCurrentDate(): void {
    const date = new Date(this.currentYear(), this.currentMonth(), 1);
    this.currentDate.set(date);
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
    const map = new Map<string, { pid: string; accessibility: string, licenses: string[] }>();

    for (const item of items) {
      const date = this.parseDate(item['date.str']);
      if (!date || !item.pid) continue;

      const key = this.formatDateKey(date);
      map.set(key, {
        pid: item.pid,
        accessibility: item.accessibility || 'private',
        licenses: item.licenses || [],
      });
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

  getMinDate(): Date {
    return new Date(this.currentYear(), this.currentMonth(), 1);
  }

  getMaxDate(): Date {
    return new Date(this.currentYear(), this.currentMonth() + 1, 0);
  }

  dateClass = (date: Date): string => {
    const data = this.issueMap().get(this.formatDateKey(date));
    const isLocked = this.recordHandler.isRecordLocked(data?.licenses || []);
    return data ? `has-issue accessibility-${isLocked ? 'private' : 'public'}` : '';
  };

  onDateSelected(date: Date | null): void {
    if (!date) return;
    const data = this.issueMap().get(this.formatDateKey(date));
    if (data?.pid) {
      this.dateSelected.emit(data.pid);
    }
  }

  close(): void {
    this.closePopup.emit();
  }
}
