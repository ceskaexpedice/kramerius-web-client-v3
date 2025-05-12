import {Component, inject, model, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectAvailablePeriodicalYears,
  selectPeriodicalError,
  selectPeriodicalLoading,
  selectPeriodicalYears,
} from '../../state/periodical-detail/periodical-detail.selectors';
import {loadPeriodical, loadPeriodicalYears} from '../../state/periodical-detail/periodical-detail.actions';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable} from 'rxjs';
import {AvailableYear, PeriodicalItemYear} from '../models/periodical-item';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-view-page.component.html',
  styleUrl: './periodical-view-page.component.scss'
})
export class PeriodicalViewPageComponent {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  availableYears: AvailableYear[] = [];
  viewMode = signal<'timeline' | 'grid-years' | 'calendar' | 'grid-issues'>('timeline');

  selectedYear = signal<string | null>(null);

  years$ = this.store.select(selectPeriodicalYears);
  availableYears$ = this.store.select(selectAvailablePeriodicalYears);
  loading$ = this.store.select(selectPeriodicalLoading);
  error$ = this.store.select(selectPeriodicalError);

  constructor() {
    this.availableYears$.subscribe(data => (this.availableYears = data));
  }

  ngOnInit() {
    this.store.dispatch(loadPeriodicalYears());
  }

  onSelectYear(year: string) {
    this.selectedYear.set(year);
    this.viewMode.set('calendar');
  }

  changeView(mode: 'timeline' | 'grid-years' | 'calendar' | 'grid-issues') {
    this.viewMode.set(mode);
  }

  getSelectedPid(): string | null {
    const year = this.selectedYear();
    return this.availableYears.find(y => y.year === year)?.pid || null;
  }

}
