import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgClass, NgForOf} from '@angular/common';

@Component({
  selector: 'app-periodical-years-timeline',
  imports: [
    NgForOf,
  ],
  templateUrl: './periodical-years-timeline.component.html',
  styleUrls: ['./periodical-years-timeline.component.scss', '../periodical-base.scss']
})
export class PeriodicalYearsTimelineComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();
}
