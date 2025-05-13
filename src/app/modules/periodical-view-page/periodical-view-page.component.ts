import {Component, inject, model, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectAvailablePeriodicalYears, selectPeriodicalDocument,
  selectPeriodicalError,
  selectPeriodicalLoading,
  selectPeriodicalYears,
} from '../../state/periodical-detail/periodical-detail.selectors';
import {loadPeriodical, loadPeriodicalYears} from '../../state/periodical-detail/periodical-detail.actions';
import {ActivatedRoute, Router} from '@angular/router';
import {distinctUntilChanged, filter, Observable, take} from 'rxjs';
import {AvailableYear, PeriodicalItemYear} from '../models/periodical-item';
import {map, tap} from 'rxjs/operators';
import {ViewMode} from './models/view-mode.enum';

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

  document$ = this.store.select(selectPeriodicalDocument);
  availableYears: AvailableYear[] = [];
  periodicalYears: PeriodicalItemYear[] = []; // New property to store generated years
  viewMode = signal<'timeline' | 'grid-years' | 'calendar' | 'grid-issues'>('timeline');

  selectedYear = signal<string | null>(null);

  years$ = this.store.select(selectPeriodicalYears);
  availableYears$ = this.store.select(selectAvailablePeriodicalYears);
  loading$ = this.store.select(selectPeriodicalLoading);
  error$ = this.store.select(selectPeriodicalError);

  constructor() {
    this.availableYears$.pipe(
        tap(data => {
          this.availableYears = data;
          // Generate PeriodicalItemYear objects from availableYears
          this.generateYearsFromAvailable();
        })
    ).subscribe();
  }

  ngOnInit() {
    this.route.queryParams
        .pipe(
            map(params => params['uuid']),
            filter(Boolean),
            distinctUntilChanged()
        )
        .subscribe(uuid => {
          this.store.dispatch(loadPeriodical());
        });

    this.document$
        .pipe(filter(doc => !!doc))
        .subscribe(doc => {
          const model = doc.model;

          if (model === 'periodical') {
            this.viewMode.set('timeline');
            this.selectedYear.set(null);
          } else if (model === 'periodicalvolume') {
            const dateStr = doc['date.str'];
            if (dateStr) {
              this.selectedYear.set(dateStr);
              this.viewMode.set('calendar');
            }
          }
        });

    this.availableYears$
        .pipe(tap(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
        }))
        .subscribe();
  }

  // New method to generate PeriodicalItemYear objects from availableYears
  private generateYearsFromAvailable() {
    if (this.availableYears.length > 0) {
      const years = this.availableYears.map(year => ({
        year: year.year,
        exists: true
      }));

      // Sort years in ascending order
      years.sort((a, b) => parseInt(a.year) - parseInt(b.year));

      this.periodicalYears = years;
    }
  }

  onSelectYear(year: string) {
    const match = this.availableYears.find(y => y.year === year);
    if (!match) return;

    this.router.navigate([], {
      queryParams: { uuid: match.pid },
      queryParamsHandling: 'merge'
    });

    this.store.dispatch(loadPeriodical());
  }

  changeView(mode: 'timeline' | 'grid-years' | 'calendar' | 'grid-issues') {
    this.viewMode.set(mode);
  }

  getSelectedPid(): string | null {
    const year = this.selectedYear();
    return this.availableYears.find(y => y.year === year)?.pid || null;
  }

  goBackToYears() {
    this.store.select(selectPeriodicalDocument).pipe(take(1)).subscribe(doc => {
      const rootPid = doc?.['root.pid'];
      if (rootPid) {
        this.router.navigate([], {
          queryParams: { uuid: rootPid },
          queryParamsHandling: 'merge'
        });
        this.store.dispatch(loadPeriodical());
      }
    });
  }


  protected readonly ViewMode = ViewMode;
}
