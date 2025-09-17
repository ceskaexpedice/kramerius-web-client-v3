import {Component, EventEmitter, Input, Output} from '@angular/core';
import {PeriodicalItemYear} from '../../../models/periodical-item';
import {NgForOf} from '@angular/common';
import {RecordItemComponent} from '../../../../shared/components/record-item/record-item.component';
import {RecordItem} from '../../../../shared/components/record-item/record-item.model';

@Component({
  selector: 'app-periodical-years-grid',
  imports: [
    NgForOf,
    RecordItemComponent,
  ],
  templateUrl: './periodical-years-grid.component.html',
  styleUrl: './periodical-years-grid.component.scss'
})
export class PeriodicalYearsGridComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();

  // Convert PeriodicalItemYear to RecordItem
  toRecordItem(year: PeriodicalItemYear): RecordItem {
    return {
      id: year.pid,
      title: year.year,
      model: year.model,
      licenses: year.licenses || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };
  }
}
