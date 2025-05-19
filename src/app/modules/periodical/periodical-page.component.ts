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
import {LocalStorageService} from '../../shared/services/local-storage.service';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-page.component.html',
  styleUrl: './periodical-page.component.scss'
})
export class PeriodicalPageComponent {
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private recordHandler = inject(RecordHandlerService);
  private localStorage = inject(LocalStorageService);

  // Signals
  activeCalendarGridControl = signal<CalendarGridControl>('calendar');
  viewMode = signal<ViewMode>(ViewMode.Timeline);
  selectedYear = signal<string | null>(null);

  protected readonly ViewMode = ViewMode;

  // Observables
  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  loading$ = this.store.select(selectPeriodicalLoading);
  error$ = this.store.select(selectPeriodicalError);

  // Local State
  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  constructor() {
    this.availableYears$.pipe(
      filter(Boolean),
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

    this.document$.pipe(filter(Boolean)).subscribe(doc => {
      this.handleDocument(doc);
    });
  }

  private handleDocument(doc: any): void {
    const model = doc.model;
    const dateStr = doc['date.str'] ?? null;

    if (model === 'periodical') {
      this.viewMode.set(ViewMode.Timeline);
      this.selectedYear.set(null);
    } else if (model === 'periodicalvolume') {
      this.selectedYear.set(dateStr);
      this.viewMode.set(ViewMode.Calendar);
    }

    const storedView = this.loadViewModeFromLocalStorage();
    this.activeCalendarGridControl.set(storedView);
    this.setView(storedView);
  }

  setView(view: CalendarGridControl): void {
    this.saveViewModeToLocalStorage(view);

    const hasSelectedYear = !!this.selectedYear();
    const newView = view === 'calendar'
      ? (hasSelectedYear ? ViewMode.Calendar : ViewMode.Timeline)
      : (hasSelectedYear ? ViewMode.GridIssues : ViewMode.GridYears);

    this.changeView(newView);
  }

  saveViewModeToLocalStorage(view: CalendarGridControl): void {
    this.localStorage.set(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY, view);
  }

  loadViewModeFromLocalStorage(): CalendarGridControl {
    return this.localStorage.get<CalendarGridControl>(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY) ?? 'calendar';
  }

  changeView(mode: ViewMode): void {
    this.viewMode.set(mode);
  }

  goToPreviousYear(): void {
    this.navigateToRelativeYear(-1);
  }

  goToNextYear(): void {
    this.navigateToRelativeYear(1);
  }

  private navigateToRelativeYear(offset: number): void {
    if (!this.selectedYear() || this.availableYears.length === 0) return;

    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());
    const target = this.availableYears[currentIndex + offset];
    if (target) this.selectYear(target.year);
  }

  selectYear(year: string): void {
    this.selectedYear.set(year);
    const pid = this.availableYears.find(y => y.year === year)?.pid;
    if (pid) this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]);
  }

  onSelectYear(year: string): void {
    const match = this.availableYears.find(y => y.year === year);
    if (match) this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, match.pid]);
  }

  goBackToYears(): void {
    this.document$.pipe(take(1)).subscribe(doc => {
      const rootPid = doc?.['root.pid'];
      if (rootPid) this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, rootPid]);
    });
  }

  goBackClicked(): void {
    if (this.selectedYear()) {
      this.goBackToYears();
    } else {
      this.recordHandler.navigateFromPeriodicalToSearchResults();
    }
  }

  getSelectedPid(): string | null {
    const year = this.selectedYear();
    return this.availableYears.find(y => y.year === year)?.pid ?? null;
  }

  private generateYearsFromAvailable(): void {
    this.periodicalYears = [...this.availableYears]
      .map(y => ({ ...y, exists: true }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }

}
