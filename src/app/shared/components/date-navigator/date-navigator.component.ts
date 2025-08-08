import {Component, EventEmitter, Input, Output, signal} from '@angular/core';
import {CalendarPopupComponent} from '../calendar-popup/calendar-popup.component';
import {NgIf} from '@angular/common';

@Component({
  selector: 'app-date-navigator',
  imports: [CalendarPopupComponent, NgIf],
  templateUrl: './date-navigator.component.html',
  styleUrl: './date-navigator.component.scss'
})
export class DateNavigatorComponent {

  @Input() mode: 'year' | 'date' = 'date';
  @Input() value!: string;
  @Input() enableCalendarPopup: boolean = false;
  @Input() periodicalChildren: any[] = [];

  @Output() goToNext = new EventEmitter<void>();
  @Output() goToPrevious = new EventEmitter<void>();
  @Output() dateSelected = new EventEmitter<string>();

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

  onCalendarDateSelected(pid: string) {
    this.dateSelected.emit(pid);
    this.showCalendarPopup.set(false);
  }

  closeCalendar() {
    this.showCalendarPopup.set(false);
  }

  getYearFromValue(): string {
    // Extract year from date string (DD.MM.YYYY format)
    if (this.value && this.value.includes('.')) {
      const parts = this.value.split('.');
      return parts[2] || '';
    }
    return this.value;
  }

}
