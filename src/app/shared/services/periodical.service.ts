import {inject, Injectable, signal} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import { Store } from '@ngrx/store';
import {distinctUntilChanged, filter, map, take} from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';
import {ViewMode} from '../../modules/periodical/models/view-mode.enum';
import {CalendarGridControl} from '../components/toolbar-controls/toolbar-controls.component';
import {PeriodicalItemYear} from '../../modules/models/periodical-item';
import {LocalStorageService} from './local-storage.service';
import { RecordHandlerService } from './record-handler.service';
import {
  selectAvailableYears, selectPeriodicalChildren,
  selectPeriodicalDocument, selectPeriodicalError, selectPeriodicalLoading, selectPeriodicalMetadata,
} from '../../modules/periodical/state/periodical-detail.selectors';
import {loadPeriodical} from '../../modules/periodical/state/periodical-detail.actions';
import {toSignal} from '@angular/core/rxjs-interop';
import {DetailViewService} from '../../modules/detail-view-page/services/detail-view.service';

@Injectable({ providedIn: 'root' })
export class PeriodicalService {
  uuid: string | null = null;
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  viewMode = signal<ViewMode>(ViewMode.Timeline);
  activeCalendarGridControl = signal<CalendarGridControl>('calendar');
  selectedYear = signal<string | null>(null);

  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  // Store Observables
  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);
  metadata$ = this.store.select(selectPeriodicalMetadata);
  error$ = this.store.select(selectPeriodicalError);

  private documentSignal = toSignal(this.document$, { initialValue: null });
  private metadataSignal = toSignal(this.metadata$, { initialValue: null });

  private route = inject(ActivatedRoute);

  constructor(
    private store: Store,
    private router: Router,
    private localStorage: LocalStorageService,
    private recordHandler: RecordHandlerService,
    private detailView: DetailViewService
  ) {

    if (this.availableYears$) {
      this.availableYears$.pipe(
        filter(Boolean),
        map(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
        })
      ).subscribe();
    }

    this.watchRouteParams();
  }

  checkForDataNeedToLoad(rootPid: string): void {
    if (
      (!this.availableYears || this.availableYears.length === 0)
    ) {
      // Dispatch if pid is valid
      this.store.dispatch(loadPeriodical({ uuid: rootPid }));
    } else {
      console.warn('Invalid document root.pid or no data to load.');
    }
  }


  watchRouteParams(): void {
    console.log('🔄 Subscribing to route/url changes');

    // Detect any time the URL changes (e.g., user clicks a year and uuid changes in URL)
    this.router.events.pipe(
      filter(event => {
        return event instanceof NavigationEnd && event.url.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)
      })
    ).subscribe(() => {
      console.log('🔄 NavigationEnd detected, checking for UUID in URL');

      const rawUrl = this.router.routerState.snapshot.url;
      const match = rawUrl.match(/(uuid:[a-f0-9\-]+)/i);
      const finalUuid = match?.[1] ?? null;

      if (finalUuid && finalUuid !== this.uuid) {
        console.log('🔁 UUID changed, loading new periodical:', finalUuid);
        this.uuid = finalUuid;
        this.store.dispatch(loadPeriodical({ uuid: finalUuid }));
      }
    });

    // Initial doc handling after load
    this.document$.pipe(filter(Boolean)).subscribe(doc => {
      this.handleDocument(doc);
    });
  }

  get document() {
    return this.documentSignal();
  }

  get metadata() {
    return this.metadataSignal();
  }

  handleDocument(doc: any): void {
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

  setView(view: string): void {
    this.saveViewModeToLocalStorage(view);
    const hasSelectedYear = !!this.selectedYear();
    const newView = view === 'calendar'
      ? (hasSelectedYear ? ViewMode.Calendar : ViewMode.Timeline)
      : (hasSelectedYear ? ViewMode.GridIssues : ViewMode.GridYears);
    this.viewMode.set(newView);
  }

  goToPreviousYear(): void {
    this.navigateToRelativeYear(-1);
  }

  goToNextYear(): void {
    this.navigateToRelativeYear(1);
  }

  getCurrentPeriodicalIssueDate(): string | null {
    // return date.str from current document
    console.log('document', this.document);
    return this.document?.['date.str'] ?? null;
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
    if (pid) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid]);
    }
  }

  onSelectYear(year: string): void {
    const match = this.availableYears.find(y => y.year === year);
    console.log('availableYears', this.availableYears);
    if (match) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, match.pid]);
    }
  }

  onCalendarDateSelected(pid: string): void {
    this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
  }

  goBackToYears(): void {
    this.document$.pipe(take(1)).subscribe(doc => {
      const rootPid = doc?.['root.pid'];
      if (rootPid) {
        this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, rootPid]);
      }
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

  private saveViewModeToLocalStorage(view: string): void {
    this.localStorage.set(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY, view);
  }

  private loadViewModeFromLocalStorage(): CalendarGridControl {
    return this.localStorage.get<CalendarGridControl>(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY) ?? 'calendar';
  }

  public goToNextPeriodicalYear() {
    // we have selected year
    // find the index of the selected year in availableYears
    if (!this.selectedYear() || this.availableYears.length === 0) return;

    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());

    // if the index is not found or it's the last year, do nothing
    if (currentIndex === -1 || currentIndex === this.availableYears.length - 1) return;

    // get the next year
    const nextYear = this.availableYears[currentIndex + 1];

    // navigate to the next year
    if (nextYear) {
      this.selectYear(nextYear.year);
    }
  }

  public goToPreviousPeriodicalYear() {
    // we have selected year
    // find the index of the selected year in availableYears
    if (!this.selectedYear() || this.availableYears.length === 0) return;

    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());

    // if the index is not found or it's the first year, do nothing
    if (currentIndex <= 0) return;

    // get the previous year
    const previousYear = this.availableYears[currentIndex - 1];

    // navigate to the previous year
    if (previousYear) {
      this.selectYear(previousYear.year);
    }
  }

  public goToNextPeriodicalIssue() {
    // take current uuid
    // find the index in periodicalChildren$ where uuid matches
    // if found, navigate to the next issue
    if (!this.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      const currentIndex = children.findIndex(child => child.pid === this.uuid);
      if (currentIndex !== -1 && currentIndex < children.length - 1) {
        const nextIssue = children[currentIndex + 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, nextIssue.pid]);
      }
    });
  }

  public goToPreviousPeriodicalIssue() {
    // take current uuid
    // find the index in periodicalChildren$ where uuid matches
    // if found, navigate to the previous issue
    if (!this.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      const currentIndex = children.findIndex(child => child.pid === this.uuid);
      if (currentIndex > 0) {
        const previousIssue = children[currentIndex - 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, previousIssue.pid]);
      }
    });
  }

  public getCurrentPeriodicalYearPid(): string | null {
    // Return the pid of the currently selected year
    const year = this.selectedYear();

    console.log('selectedYear', year);
    console.log('availableYears', this.availableYears);
    if (!year) return null;

    const yearData = this.availableYears.find(y => y.year === year);
    return yearData ? yearData.pid : null;
  }
}
