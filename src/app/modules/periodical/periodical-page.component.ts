import {Component, inject, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectAvailableYears,
  selectPeriodicalDocument,
  selectPeriodicalError,
  selectPeriodicalLoading,
} from './state/periodical-detail.selectors';
import {loadPeriodical} from './state/periodical-detail.actions';
import {ActivatedRoute, Router} from '@angular/router';
import {distinctUntilChanged, filter, take} from 'rxjs';
import {PeriodicalItemYear} from '../models/periodical-item';
import {map} from 'rxjs/operators';
import {ViewMode} from './models/view-mode.enum';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {RecordHandlerService} from '../../shared/services/record-handler.service';
import {CalendarGridControl} from '../../shared/components/toolbar-controls/toolbar-controls.component';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-page.component.html',
  styleUrl: './periodical-page.component.scss'
})
export class PeriodicalPageComponent {
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recordHandler = inject(RecordHandlerService);

  // Signals
  viewMode = signal<ViewMode>(ViewMode.Timeline);
  selectedYear = signal<string | null>(null);

  protected readonly ViewMode = ViewMode;

  // State
  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  loading$ = this.store.select(selectPeriodicalLoading);
  error$ = this.store.select(selectPeriodicalError);

  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  constructor() {
    this.availableYears$.pipe(
      filter(data => !!data),
      map(data => {
        this.availableYears = data;
        this.generateYearsFromAvailable();
      })
    ).subscribe();

  }

  ngOnInit(): void {
    this.route.params.pipe(
      map(params => params['uuid']),
      filter(Boolean),
      distinctUntilChanged()
    ).subscribe((uuid: string) => {
      this.store.dispatch(loadPeriodical({ uuid }));
    });

    this.document$.pipe(
      filter(Boolean)
    ).subscribe(doc => {
      const model = doc.model;
      if (model === 'periodical') {
        this.viewMode.set(ViewMode.Timeline);
        this.selectedYear.set(null);
      } else if (model === 'periodicalvolume') {
        const dateStr = doc['date.str'];
        this.selectedYear.set(dateStr ?? null);
        this.viewMode.set(ViewMode.Calendar);
      }
    });
  }

  setView(view: CalendarGridControl) {
    if (view === 'calendar') {
      if (this.selectedYear()) {
        this.changeView(ViewMode.Calendar);
      } else {
        this.changeView(ViewMode.Timeline);
      }
    } else {
      if (this.selectedYear()) {
        this.changeView(ViewMode.GridIssues);
      } else {
        this.changeView(ViewMode.GridYears);
      }
    }
  }

  changeView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  goToPreviousYear(): void {
    if (!this.selectedYear() || this.availableYears.length === 0) {
      console.warn('No available years or no year selected.');
      return;
    }

    const currentIndex = this.availableYears.findIndex(year => year.year === this.selectedYear());
    if (currentIndex > 0) {
      const previousYear = this.availableYears[currentIndex - 1].year;
      this.selectYear(previousYear);
    } else {
      console.warn('No previous year available.');
    }
  }

  goToNextYear(): void {
    if (!this.selectedYear() || this.availableYears.length === 0) {
      console.warn('No available years or no year selected.');
      return;
    }

    const currentIndex = this.availableYears.findIndex(year => year.year === this.selectedYear());
    if (currentIndex < this.availableYears.length - 1) {
      const nextYear = this.availableYears[currentIndex + 1].year;
      this.selectYear(nextYear);
    } else {
      console.warn('No next year available.');
    }
  }


  /**
   * Handle user selection of a year.
   */
  selectYear(year: string): void {
    this.selectedYear.set(year);

    // If navigation is required:
    const matchingYearPid = this.availableYears.find(y => y.year === year)?.pid;
    if (matchingYearPid) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, matchingYearPid]);
    }
  }


  onSelectYear(year: string): void {
    const match = this.availableYears.find(y => y.year === year);
    if (match) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, match.pid]);
    }
  }

  goBackToYears(): void {
    this.store.select(selectPeriodicalDocument).pipe(take(1)).subscribe(doc => {
      const rootPid = doc?.['root.pid'];
      if (rootPid) {
        this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, rootPid]);
      }
    });
  }

  getSelectedPid(): string | null {
    const year = this.selectedYear();
    return this.availableYears.find(y => y.year === year)?.pid ?? null;
  }

  private generateYearsFromAvailable(): void {
    const years = this.availableYears.map(year => ({
      year: year.year,
      exists: true,
      pid: year.pid,
      accessibility: year.accessibility
    }));

    years.sort((a, b) => parseInt(a.year) - parseInt(b.year));
    this.periodicalYears = years;
  }

  goBackClicked() {
    if (this.selectedYear()) {
      this.goBackToYears();
    } else {
      this.recordHandler.navigateFromPeriodicalToSearchResults();
    }
  }

}
