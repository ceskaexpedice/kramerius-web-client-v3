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
} from '../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import {loadPeriodical} from '../../modules/periodical/state/periodical-detail/periodical-detail.actions';
import {toSignal} from '@angular/core/rxjs-interop';
import {DetailViewService} from '../../modules/detail-view-page/services/detail-view.service';
import {FilterService} from './filter.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {QueryParamsService} from '../../core/services/QueryParamsManager';
import {selectActiveFilters} from '../../modules/search-results-page/state/search.selectors';
import {SolrService} from '../../core/solr/solr.service';
import {loadPeriodicalSearchResults} from '../../modules/periodical/state/periodical-search/periodical-search.actions';
import {
  selectPeriodicalSearchStateFacets,
  selectPeriodicalSearchStateResults,
} from '../../modules/periodical/state/periodical-search/periodical-search.selectors';
import {UserService} from './user.service';

@Injectable({providedIn: 'root'})
export class PeriodicalService implements FilterService {
  uuid: string | null = null;
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  viewMode = signal<ViewMode>(ViewMode.Timeline);
  activeCalendarGridControl = signal<CalendarGridControl>('calendar');
  selectedYear = signal<string | null>(null);

  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  inputSearchTerm = '';

  private _page = signal(1);
  private _pageSize = signal(60);
  private _totalCount = signal(0);
  private _sortBy = signal(SolrSortFields.relevance);
  private _sortDirection = signal(SolrSortDirections.desc);
  private _pageReset = signal(false);
  private _submittedTerm = signal('');
  private _searchTerm = signal('');

  private initialized = false;

  private _activeFiltersSignal = toSignal(
    this.store.select(selectActiveFilters),
    {initialValue: []}
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
  searchResults$ = this.store.select(selectPeriodicalSearchStateResults);

  private documentSignal = toSignal(this.document$, {initialValue: null});
  private metadataSignal = toSignal(this.metadata$, {initialValue: null});

  get searchTerm() {
    return this._searchTerm;
  }

  private route = inject(ActivatedRoute);
  private queryParamsService = inject(QueryParamsService);
  private solrService = inject(SolrService);

  constructor(
    private store: Store,
    private router: Router,
    private localStorage: LocalStorageService,
    private recordHandler: RecordHandlerService,
    private detailView: DetailViewService,
    private userService: UserService,
  ) {

    this.load();

    this.initialize();

    if (this.availableYears$) {
      this.availableYears$.pipe(
        filter(Boolean),
        map(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
        }),
      ).subscribe();
    }

  }

  async load(): Promise<void> {
    await this.userService.loadLicenses();
  }

  async initialize() {
    if (this.initialized) return;

    // await this.userService.loadLicenses();

    const extractUuid = (url: string): string | null => {
      const match = url.match(/(uuid:[a-f0-9\-]+)/i);
      return match?.[1] ?? null;
    };

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      const rawUrl = this.router.url;
      const currentRoute = rawUrl.split('?')[0];
      const queryParams = this.route.snapshot.queryParams; // snapshot použijeme, aby sme nemuseli subscribe

      this.uuid = extractUuid(rawUrl);
      console.log('URL changed. UUID:', this.uuid, 'QueryParams:', queryParams);

      if (currentRoute.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)) {
        this.dispatchPeriodicalSearch(Object.keys(queryParams).length ? queryParams : null);
      }
    });

    this.document$.pipe(filter(Boolean)).subscribe(doc => {
      console.log('document loaded:', doc);
      this.handleDocument(doc);
    });

    this.initialized = true;
  }


  private dispatchPeriodicalSearch(params: any): void {

    console.log('uuid:', this.uuid);

    if (!this.uuid) return;

    const query = params && params['query'] || '';

    if (query && query.length > 0) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

    const baseFilters = this.queryParamsService.getFilters(params);
    const { advancedQuery, advancedQueryMainOperator } = { advancedQuery: undefined, advancedQueryMainOperator: undefined };

    let page = 1;
    if (!this._pageReset()) {
      page = Number(params && params['page']) || this._page();
    } else {
      this._pageReset.set(false);
      this.goToPage(page);
    }

    console.log('baseFilters:', baseFilters);

    const pageSize = Number(params && params['pageSize']) || this._pageSize();
    const sortBy = params && params['sortBy'] || this._sortBy();
    const sortDirection = params && params['sortDirection'] || this._sortDirection();

    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    console.log('query periodical:', query);

    // if we dont have search term, we do loadPeriodical
    if (!query || query.length === 0) {
      this.store.dispatch(loadPeriodical({ uuid: this.uuid, filters: baseFilters, page: (page - 1) * pageSize, pageCount: pageSize, sortBy, sortDirection }));
      return;
    }

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
    return this.store.select(selectPeriodicalSearchStateFacets);
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('[PeriodicalService] getting suggestions for:', term);
    return this.solrService.getAutocompleteSuggestions(term);
  }

  onSearch(term: string | null): void {
    const query = (term && term.length > 0) ? `${term}` : '';
    this._submittedTerm.set(query);
    // reset page to 1
    this._page.set(1);
    this.search(query);
  }

  onSubmit(term: string): void {
    this.onSearch(term);
  }

  onSuggestionSelected(suggestion: string): void {
    this._submittedTerm.set(suggestion);
    this.search(suggestion);
  }

  search(query: string): void {
    //this.initialize();
    this.router.navigate([`/${APP_ROUTES_ENUM.PERIODICAL_VIEW}/${this.uuid}`], {
      queryParams: {
        query,
        page: this._page(),
        pageSize: this._pageSize(),
        sortBy: this._sortBy(),
        sortDirection: this._sortDirection()
      },
      queryParamsHandling: 'merge'
    });
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
