import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgForOf} from '@angular/common';
import {ItemCardComponent} from '../../../../shared/components/item-card/item-card.component';

@Component({
  selector: 'app-periodical-years-grid',
  imports: [
    NgForOf,
    ItemCardComponent,
  ],
  templateUrl: './periodical-years-grid.component.html',
  styleUrl: './periodical-years-grid.component.scss'
})
export class PeriodicalYearsGridComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();
}
