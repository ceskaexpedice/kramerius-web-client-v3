import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-periodical-year-issues-grid',
  imports: [],
  templateUrl: './periodical-year-issues-grid.component.html',
  styleUrl: './periodical-year-issues-grid.component.scss'
})
export class PeriodicalYearIssuesGridComponent {
  @Input() year!: string;
  @Input() pid!: string;
}
