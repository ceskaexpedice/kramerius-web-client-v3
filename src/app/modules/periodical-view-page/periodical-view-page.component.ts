import {Component, model} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectAvailablePeriodicalYears,
  selectPeriodicalError,
  selectPeriodicalLoading,
  selectPeriodicalYears,
} from '../../state/periodical-detail/periodical-detail.selectors';
import {loadPeriodical, loadPeriodicalYears} from '../../state/periodical-detail/periodical-detail.actions';
import {Router} from '@angular/router';
import {Observable} from 'rxjs';
import {AvailableYear, PeriodicalItemYear} from '../models/periodical-item';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-view-page.component.html',
  styleUrl: './periodical-view-page.component.scss'
})
export class PeriodicalViewPageComponent {

  selected = model<Date | null>(null);

  periodicalYears$: Observable<PeriodicalItemYear[]> = this.store.select(selectPeriodicalYears);
  availableYears$: Observable<AvailableYear[]> = this.store.select(selectAvailablePeriodicalYears);
  loading$ = this.store.select(selectPeriodicalLoading);
  error$ = this.store.select(selectPeriodicalError);

  availableYears: AvailableYear[] = [];

  constructor(
    private store: Store,
    private router: Router
  ) {}

  ngOnInit() {
    this.store.dispatch(loadPeriodical());

    this.availableYears$.subscribe(data => {
      this.availableYears = data;
    });
  }

  selectYear(year: string) {
    const match = this.availableYears.find(y => y.year === year);
    if (match) {
      this.router.navigate([], {
        queryParams: { uuid: match.pid },
        queryParamsHandling: 'merge',
      });

      this.store.dispatch(loadPeriodical());
    }
  }

}
