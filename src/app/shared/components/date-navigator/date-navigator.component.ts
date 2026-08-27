import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {CalendarPopupComponent} from '../calendar-popup/calendar-popup.component';
import {NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {CdkTooltipDirective} from '../../directives';
import {parseIssueDateStr} from '../../utils/periodical-date';

@Component({
  selector: 'app-date-navigator',
  imports: [CalendarPopupComponent, NgIf, TranslatePipe, CdkTooltipDirective],
  templateUrl: './date-navigator.component.html',
  styleUrl: './date-navigator.component.scss'
})
export class DateNavigatorComponent {

  @Input() mode: 'year' | 'date' = 'date';
  @Input() value!: string;
  @Input() issueTypeCode?: string;
  @Input() enableCalendarPopup: boolean = false;
  @Input() periodicalChildren: any[] = [];
  @Input() previousTooltip?: string;
  @Input() nextTooltip?: string;

  @Output() goToNext = new EventEmitter<void>();
  @Output() goToPrevious = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<{pid: string, year: number}>();

  showCalendarPopup = signal(false);

  prev() {
    this.goToPrevious.emit();
  }

  next() {
    this.goToNext.emit();
  }

  toggleCalendar() {
    if (this.enableCalendarPopup) {
      this.showCalendarPopup.set(!this.showCalendarPopup());
    }
  }

  onCalendarDateSelected(dateInfo: {pid: string, year: number}) {
    this.dateSelected.emit(dateInfo);
    this.showCalendarPopup.set(false);
  }

  closeCalendar() {
    this.showCalendarPopup.set(false);
  }

  getYearFromValue(): string {
    // `value` is either a plain year (mode 'year') or a publication date, which
    // may be a range of days such as "03.-09.01.1986" — splitting on '.' and
    // taking the third part would yield "01" there (see issue #166).
    if (this.value && this.value.includes('.')) {
      const date = parseIssueDateStr(this.value);
      return date ? date.getFullYear().toString() : '';
    }
    return this.value;
  }

}
