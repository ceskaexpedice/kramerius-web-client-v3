import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
import { PeriodicalItemYear } from '../../../models/periodical-item';
import { Store } from '@ngrx/store';
import { AsyncPipe, NgForOf } from '@angular/common';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { RecordHandlerService } from '../../../../shared/services/record-handler.service';
import { DocumentTypeEnum } from "../../../constants/document-type";
import { SkeletonListPipe } from '../../../../shared/pipes/skeleton-list.pipe';
import { selectPeriodicalLoading } from '../../state/periodical-detail/periodical-detail.selectors';

@Component({
  selector: 'app-periodical-years-grid',
  imports: [
    NgForOf,
    RecordItemComponent,
    AsyncPipe,
    SkeletonListPipe
  ],
  templateUrl: './periodical-years-grid.component.html',
  styleUrl: './periodical-years-grid.component.scss'
})
export class PeriodicalYearsGridComponent {
  @Input() years: PeriodicalItemYear[] = [];
  @Output() selectYear = new EventEmitter<string>();

  private recordHandlerService = inject(RecordHandlerService);
  private store = inject(Store);

  loading$ = this.store.select(selectPeriodicalLoading);

  // Convert PeriodicalItemYear to RecordItem
  toRecordItem(year: PeriodicalItemYear): RecordItem {
    return {
      id: year.pid,
      title: year.year,
      model: year.model as DocumentTypeEnum || '',
      licenses: year.licenses || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };
  }

  // Convert PeriodicalItemYear to RecordItem with badge layout consideration
  toRecordItemWithBadgeLayout(year: PeriodicalItemYear, allYears: PeriodicalItemYear[]): RecordItem {
    return this.recordHandlerService.periodicalYearToRecordItemWithBadgeLayout(year, allYears);
  }
}
