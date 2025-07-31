import {Component, inject, Input} from '@angular/core';
import {selectPeriodicalChildren} from '../../state/periodical-detail/periodical-detail.selectors';
import {Store} from '@ngrx/store';
import {AsyncPipe, NgForOf} from '@angular/common';
import {ItemCardComponent} from '../../../../shared/components/item-card/item-card.component';
import {APP_ROUTES_ENUM} from '../../../../app.routes';
import {PeriodicalItemChild} from '../../../models/periodical-item';
import {Router} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-periodical-year-issues-grid',
  imports: [
    NgForOf,
    AsyncPipe,
    ItemCardComponent,
    TranslatePipe,
  ],
  templateUrl: './periodical-year-issues-grid.component.html',
  styleUrl: './periodical-year-issues-grid.component.scss'
})
export class PeriodicalYearIssuesGridComponent {
  private store = inject(Store);
  private router = inject(Router);

  @Input() year!: string;
  @Input() pid!: string;

  children$ = this.store.select(selectPeriodicalChildren);

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

}
