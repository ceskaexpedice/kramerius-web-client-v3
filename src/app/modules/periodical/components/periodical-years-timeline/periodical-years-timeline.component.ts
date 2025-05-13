import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgForOf} from '@angular/common';

@Component({
  selector: 'app-periodical-years-timeline',
  imports: [
    NgForOf,
  ],
  templateUrl: './periodical-years-timeline.component.html',
  styleUrl: './periodical-years-timeline.component.scss'
})
export class PeriodicalYearsTimelineComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();
}
