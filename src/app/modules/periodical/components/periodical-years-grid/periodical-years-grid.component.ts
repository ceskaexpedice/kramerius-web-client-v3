import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-periodical-years-grid',
  imports: [
    NgForOf,
  ],
  templateUrl: './periodical-years-grid.component.html',
  styleUrl: './periodical-years-grid.component.scss'
})
export class PeriodicalYearsGridComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();
}
