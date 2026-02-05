import { Component, inject, Input } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { selectPeriodicalChildren } from '../../state/periodical-detail/periodical-detail.selectors';
import { Store } from '@ngrx/store';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { RecordItemComponent } from '../../../../shared/components/record-item/record-item.component';
import { APP_ROUTES_ENUM } from '../../../../app.routes';
import { PeriodicalItemChild } from '../../../models/periodical-item';
import { Router } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { RecordItem } from '../../../../shared/components/record-item/record-item.model';
import { RecordHandlerService } from '../../../../shared/services/record-handler.service';
import { DocumentTypeEnum } from "../../../constants/document-type";
import { selectPeriodicalLoading } from '../../state/periodical-detail/periodical-detail.selectors';
import { SkeletonListPipe } from '../../../../shared/pipes/skeleton-list.pipe';

@Component({
  selector: 'app-periodical-year-issues-grid',
  imports: [
    NgForOf,
    NgIf,
    AsyncPipe,
    RecordItemComponent,
    SkeletonListPipe
  ],
  templateUrl: './periodical-year-issues-grid.component.html',
  styleUrl: './periodical-year-issues-grid.component.scss'
})
export class PeriodicalYearIssuesGridComponent {
  private store = inject(Store);
  private router = inject(Router);
  private translate = inject(TranslateService);
  private recordHandlerService = inject(RecordHandlerService);

  @Input() year!: string;
  @Input() pid!: string;

  children$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);

  trackByPid(index: number, item: any): string {
    return item.pid;
  }

  onDateSelected(item: PeriodicalItemChild) {
    if (item.pid) {
      this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, item.pid]);
    }
  }

  getItemTitle(item: PeriodicalItemChild): string {
    // item['date_range_end.day'] + '.' + item['date_range_end.month']
    if (item['date_range_end.day'] && item['date_range_end.month']) {
      return `${item['date_range_end.day']}.${item['date_range_end.month']}`;
    }
    return item['date.str'];
  }

  // Convert PeriodicalItemChild to RecordItem
  toRecordItem(item: PeriodicalItemChild): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    return {
      id: item.pid,
      title: this.getItemTitle(item),
      subtitle: `${subtitlePrefix} ${item['part.number.str']}`,
      model: item.model as DocumentTypeEnum,
      licenses: item['licenses.facet'] || [],
      className: 'card--fluid',
      showFavoriteButton: false,
      showAccessibilityBadge: true
    };
  }

  // Convert PeriodicalItemChild to RecordItem with badge layout consideration
  toRecordItemWithBadgeLayout(item: PeriodicalItemChild, allItems: PeriodicalItemChild[]): RecordItem {
    const subtitlePrefix = this.translate.instant('periodicalvolume-part-subtitle');
    return this.recordHandlerService.periodicalChildToRecordItemWithBadgeLayout(
      item,
      allItems,
      subtitlePrefix,
      (item) => this.getItemTitle(item)
    );
  }

}
