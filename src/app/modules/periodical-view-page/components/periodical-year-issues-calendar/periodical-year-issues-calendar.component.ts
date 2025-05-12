import {Component, Input} from '@angular/core';
import {MatCalendar} from '@angular/material/datepicker';

@Component({
  selector: 'app-periodical-year-issues-calendar',
  imports: [
    MatCalendar,
  ],
  templateUrl: './periodical-year-issues-calendar.component.html',
  styleUrl: './periodical-year-issues-calendar.component.scss'
})
export class PeriodicalYearIssuesCalendarComponent {
  selectedDate = new Date();

  @Input() year!: string;
  @Input() pid!: string;
}
