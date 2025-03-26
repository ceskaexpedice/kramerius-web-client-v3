import {Component, inject, OnInit} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {CarouselComponent} from '../../../../shared/components/carousel/carousel.component';
import {ItemCardComponent} from '../../../../shared/components/item-card/item-card.component';
import {Store} from '@ngrx/store';
import {selectPeriodicals, selectPeriodicalsLoading} from '../../../../state/search/periodicals/periodicals.selectors';
import {loadPeriodicals} from '../../../../state/search/periodicals/periodicals.actions';

@Component({
  selector: 'app-periodicals-section',
  imports: [
    NgForOf,
    CarouselComponent,
    ItemCardComponent,
    NgIf,
    AsyncPipe,
  ],
  templateUrl: './periodicals-section.component.html',
  styleUrls: ['./periodicals-section.component.scss', '../search-section.scss'],
})
export class PeriodicalsSectionComponent implements OnInit {

  private store = inject(Store);

  periodicals$ = this.store.select(selectPeriodicals);
  loading$ = this.store.select(selectPeriodicalsLoading);

  ngOnInit(): void {
    this.store.dispatch(loadPeriodicals());
  }

}
