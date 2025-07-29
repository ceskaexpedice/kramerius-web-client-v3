import {inject, Injectable, signal, computed, effect} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {Store} from '@ngrx/store';
import {distinctUntilChanged, filter, map, Observable, of, take} from 'rxjs';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {ViewMode} from '../../modules/periodical/models/view-mode.enum';
import {CalendarGridControl} from '../components/toolbar-controls/toolbar-controls.component';
import {PeriodicalItemYear} from '../../modules/models/periodical-item';
import {LocalStorageService} from './local-storage.service';
import {RecordHandlerService} from './record-handler.service';
import {
  selectAvailableYears,
  selectPeriodicalChildren,
  selectPeriodicalDocument,
  selectPeriodicalError,
  selectPeriodicalLoading,
  selectPeriodicalMetadata,
} from '../../modules/periodical/state/periodical-detail.selectors';
import {loadPeriodical, loadPeriodicalSearchResults} from '../../modules/periodical/state/periodical-detail.actions';
import {toSignal} from '@angular/core/rxjs-interop';
import {DetailViewService} from '../../modules/detail-view-page/services/detail-view.service';
import {FilterService} from './filter.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {QueryParamsService} from '../../core/services/QueryParamsManager';
import {selectActiveFilters} from '../../modules/search-results-page/state/search.selectors';

@Injectable({providedIn: 'root'})
export class PeriodicalService implements FilterService {
  uuid: string | null = null;
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  viewMode = signal<ViewMode>(ViewMode.Timeline);
  activeCalendarGridControl = signal<CalendarGridControl>('calendar');
  selectedYear = signal<string | null>(null);

  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  private _page = signal(1);
  private _pageSize = signal(60);
  private _totalCount = signal(0);
  private _sortBy = signal(SolrSortFields.relevance);
  private _sortDirection = signal(SolrSortDirections.desc);
  private _pageReset = signal(false);
  private _submittedTerm = signal('');
  private initialized = false;

  private _activeFiltersSignal = toSignal(
    this.store.select(selectActiveFilters),
    { initialValue: [] }
  );

  totalCount$ = this._totalCount.asReadonly();
  activeFilters$ = this.store.select(selectActiveFilters);
  pageResults$ = of([]); // Placeholder
  nonPageResults$ = of([]); // Placeholder

  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);
  metadata$ = this.store.select(selectPeriodicalMetadata);
  error$ = this.store.select(selectPeriodicalError);

  private documentSignal = toSignal(this.document$, {initialValue: null});
  private metadataSignal = toSignal(this.metadata$, {initialValue: null});

  private route = inject(ActivatedRoute);
  private queryParamsService = inject(QueryParamsService);

  constructor(
    private store: Store,
    private router: Router,
    private localStorage: LocalStorageService,
    private recordHandler: RecordHandlerService,
    private detailView: DetailViewService,
  ) {
    if (this.availableYears$) {
      this.availableYears$.pipe(
        filter(Boolean),
        map(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
        }),
      ).subscribe();
    }

    this.watchRouteParams();

    this.initialize();
  }

  async initialize() {
    if (this.initialized) return;

    // await this.userService.loadLicenses();

    // route is /periodical/uuid:592a84c0-7faa-11ed-856c-5ef3fc9bb22f
    // extract uuid from the route
    this.uuid = this.route.snapshot.paramMap.get('uuid') || null;
    console.log('uuid from route:', this.uuid);

    this.route.queryParams.subscribe(params => {
      const currentRoute = this.router.url.split('?')[0];
      console.log('currentRoute:', currentRoute);
      if (currentRoute.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)) {

        this.dispatchPeriodicalSearch(params);
      }
    });

    this.initialized = true;
  }

  private dispatchPeriodicalSearch(params: any): void {

    console.log('uuid:', this.uuid);

    if (!this.uuid) return;

    const query = params['query'] || '';

    if (query && query.length > 0) {
      this._submittedTerm.set(query);
    }

    const baseFilters = this.queryParamsService.getFilters(params);
    const { advancedQuery, advancedQueryMainOperator } = { advancedQuery: undefined, advancedQueryMainOperator: undefined };

    let page = 1;
    if (!this._pageReset()) {
      page = Number(params['page']) || this._page();
    } else {
      this._pageReset.set(false);
      this.goToPage(page);
    }

    const pageSize = Number(params['pageSize']) || this._pageSize();
    const sortBy = params['sortBy'] || this._sortBy();
    const sortDirection = params['sortDirection'] || this._sortDirection();

    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    this.store.dispatch(loadPeriodicalSearchResults({
      uuid: this.uuid,
      query,
      filters: baseFilters,
      advancedQuery,
      advancedQueryMainOperator,
      page: (page - 1) * pageSize,
      pageCount: pageSize,
      sortBy,
      sortDirection
    }));
  }

  get page() { return this._page(); }
  get pageSize() { return this._pageSize(); }
  get sortBy() { return this._sortBy(); }
  get sortDirection() { return this._sortDirection(); }
  get submittedTerm() { return this._submittedTerm(); }

  get document() { return this.documentSignal(); }
  get metadata() { return this.metadataSignal(); }

  getFacets(): Observable<any> {
    throw new Error('Method not implemented for periodicals.');
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    const [facetKey, value] = fullValue.split(':');
    const params = route.snapshot.queryParams;
    const currentValues = this.queryParamsService.getFiltersByFacet(params, facetKey);

    const isSelected = currentValues.includes(value);
    const newValues = isSelected
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    const operator = this.queryParamsService.getOperatorForFacet(params, facetKey);

    this.queryParamsService.updateFilters(route, facetKey, newValues, operator);
  }

  resetPage(): void {
    this._pageReset.set(true);
  }

  goToPage(page: number) {
    this._page.set(page);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page, pageSize: this.pageSize },
      queryParamsHandling: 'merge'
    });
  }

  changePageSize(size: number) {
    this._pageSize.set(size);
    this._page.set(1);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: 1, pageSize: size },
      queryParamsHandling: 'merge'
    });
  }

  changeSortBy(sortBy: SolrSortFields, sortDirection: SolrSortDirections) {
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sortBy, sortDirection },
      queryParamsHandling: 'merge'
    });
  }

  checkForDataNeedToLoad(rootPid: string): void {
    if (!this.availableYears || this.availableYears.length === 0) {
      this.store.dispatch(loadPeriodical({uuid: rootPid}));
    }
  }

  watchRouteParams(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd && event.url.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)),
    ).subscribe(() => {
      const rawUrl = this.router.routerState.snapshot.url;
      const match = rawUrl.match(/(uuid:[a-f0-9\-]+)/i);
      const finalUuid = match?.[1] ?? null;

      if (finalUuid && finalUuid !== this.uuid) {
        this.uuid = finalUuid;
        this.store.dispatch(loadPeriodical({uuid: finalUuid}));
      }
    });

    this.document$.pipe(filter(Boolean)).subscribe(doc => {
      this.handleDocument(doc);
    });
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

  goToPreviousYear(): void { this.navigateToRelativeYear(-1); }
  goToNextYear(): void { this.navigateToRelativeYear(1); }

  getCurrentPeriodicalIssueDate(): string | null {
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
      .map(y => ({...y, exists: true}))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  }

  private saveViewModeToLocalStorage(view: string): void {
    this.localStorage.set(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY, view);
  }

  private loadViewModeFromLocalStorage(): CalendarGridControl {
    return this.localStorage.get<CalendarGridControl>(this.PERIODICAL_VIEW_LOCAL_STORAGE_KEY) ?? 'calendar';
  }

  public goToNextPeriodicalYear() {
    if (!this.selectedYear() || this.availableYears.length === 0) return;
    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());
    if (currentIndex === -1 || currentIndex === this.availableYears.length - 1) return;
    const nextYear = this.availableYears[currentIndex + 1];
    if (nextYear) {
      this.selectYear(nextYear.year);
    }
  }

  public goToPreviousPeriodicalYear() {
    if (!this.selectedYear() || this.availableYears.length === 0) return;
    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());
    if (currentIndex <= 0) return;
    const previousYear = this.availableYears[currentIndex - 1];
    if (previousYear) {
      this.selectYear(previousYear.year);
    }
  }

  public goToNextPeriodicalIssue() {
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
    const year = this.selectedYear();
    if (!year) return null;
    const yearData = this.availableYears.find(y => y.year === year);
    return yearData ? yearData.pid : null;
  }
}
