import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Observable, of, take, takeUntil, tap } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { ViewMode } from '../../modules/periodical/models/view-mode.enum';
import { CalendarGridControl } from '../components/toolbar-controls/toolbar-controls.component';
import { PeriodicalItemYear, hasCalendarDisplayableChildren } from '../../modules/models/periodical-item';
import { LocalStorageService } from './local-storage.service';
import { RecordHandlerService } from './record-handler.service';
import {
  selectAvailableYears,
  selectPeriodicalChildren,
  selectPeriodicalDocument,
  selectPeriodicalError,
  selectPeriodicalLoading,
  selectPeriodicalMetadata,
} from '../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { loadPeriodical } from '../../modules/periodical/state/periodical-detail/periodical-detail.actions';
import { toSignal } from '@angular/core/rxjs-interop';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { loadPeriodicalSearchResults } from '../../modules/periodical/state/periodical-search/periodical-search.actions';
import {
  selectPeriodicalSearchStateFacets,
  selectPeriodicalSearchStateFacetsLoading,
  selectPeriodicalSearchStateLoading,
  selectPeriodicalSearchStateResults,
  selectPeriodicalSearchStateTotalCount,
} from '../../modules/periodical/state/periodical-search/periodical-search.selectors';
import { customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { AdvancedSearchService } from './advanced-search.service';
import { BaseFilterService } from './base-filter.service';
import { SearchService } from './search.service';
import { appendToAdvancedQuery, buildDateOverlapQuery, buildYearRangeQuery, normalizeDateRangeParams } from '../utils/date-range-query';
import { ConfigService } from '../../core/config/config.service';
import { ALL_SOURCES } from '../utils/cdk-source.constants';

@Injectable()
export class PeriodicalService extends BaseFilterService {
  uuid: string | null = null;
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  viewMode = signal<ViewMode>(ViewMode.Timeline);
  activeCalendarGridControl = computed<CalendarGridControl>(() => {
    const mode = this.viewMode();
    switch (mode) {
      case ViewMode.Timeline: return 'timeline';
      case ViewMode.GridYears: return 'grid';
      case ViewMode.Calendar: return 'calendar';
      case ViewMode.GridIssues: return 'cards';
      default: return 'timeline';
    }
  });
  selectedYear = signal<string | null>(null);

  // Debug wrapper for selectedYear.set to track when it changes
  private setSelectedYear(value: string | null) {
    this.selectedYear.set(value);
  }

  availableYears: PeriodicalItemYear[] = [];
  periodicalYears: PeriodicalItemYear[] = [];

  // Lazy loading state for calendar months
  private monthlyIssuesCache = new Map<string, any[]>();
  private loadingMonths = new Set<string>();
  monthlyIssuesLoading = signal(false);

  inputSearchTerm = '';

  totalCount$ = this.store.select(selectPeriodicalSearchStateTotalCount);
  override facetsLoading$ = this.store.select(selectPeriodicalSearchStateFacetsLoading);

  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);
  metadata$ = this.store.select(selectPeriodicalMetadata);
  error$ = this.store.select(selectPeriodicalError);
  searchResults$ = this.store.select(selectPeriodicalSearchStateResults);

  private documentSignal = toSignal(this.document$, { initialValue: null });
  private metadataSignal = toSignal(this.metadata$, { initialValue: null });
  private periodicalChildrenSignal = toSignal(this.periodicalChildren$, { initialValue: [] as any[] });

  /** True only when at least one issue child has a day+month, making calendar display meaningful */
  canShowCalendar = computed<boolean>(() => hasCalendarDisplayableChildren(this.periodicalChildrenSignal()));

  POSSIBLE_FILTERS = [customDefinedFacetsEnum.accessibility, facetKeysEnum.license, 'dateFrom', 'dateTo', 'dateOffset', 'yearFrom', 'yearTo'];




  override advancedSearchService = inject(AdvancedSearchService);
  private searchService = inject(SearchService);
  private configService = inject(ConfigService);

  constructor(
    private store: Store,
    private localStorage: LocalStorageService,
    private recordHandler: RecordHandlerService,
    private detailView: DetailViewService,
  ) {
    super();
    console.log('PeriodicalService initialized');

    this.load();

    this.initialize();

    // If children load and calendar is not displayable, switch to cards view
    effect(() => {
      if (this.viewMode() === ViewMode.Calendar && !this.canShowCalendar()) {
        this.viewMode.set(ViewMode.GridIssues);
      }
    });

    // Auto-redirect when there is exactly one issue child (only if we're on the periodical page)
    // Uses replaceUrl so the single-issue periodical URL is removed from browser history,
    // allowing the back button to skip it and go to the previous page.
    this.periodicalChildren$.pipe(
      filter(children => children?.length === 1),
      filter(() => this.router.url.split('?')[0].includes(`/${APP_ROUTES_ENUM.PERIODICAL_VIEW}`)),
      takeUntil(this.destroy$)
    ).subscribe(children => {
      this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, children[0].pid], { replaceUrl: true });
    });

    if (this.availableYears$) {
      this.availableYears$.pipe(
        filter(Boolean),
        takeUntil(this.destroy$),
        tap(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
          this.maybeAutoOpenSingleYear();
        }),
      ).subscribe();
    }

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });

    // Listen for page size changes from settings
    let previousPageSize = this._pageSize();
    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        const newPageSize = settings.displayConfig?.defaultPageSize;
        if (newPageSize && newPageSize !== previousPageSize) {
          previousPageSize = newPageSize;
          this._pageSize.set(newPageSize);

          const currentRoute = this.router.url.split('?')[0];
          if (currentRoute.includes(`/${APP_ROUTES_ENUM.PERIODICAL_VIEW}`)) {
            // Update URL and reload with new page size
            this._page.set(1);
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { page: 1, pageSize: newPageSize },
              queryParamsHandling: 'merge'
            });
          }
        }
      });

  }


  async initialize() {
    if (this.initialized) return;

    // if there is no sortBy in query params, set default sort
    // Logic moved to router subscription below

    this.customSearchService.initializeFromRoute();

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const rawUrl = this.router.url;
      const currentRoute = rawUrl.split('?')[0];
      const queryParams = this.route.snapshot.queryParams;

      // Robust UUID extraction from Router State instead of Regex
      let route = this.router.routerState.root;
      let foundUuid: string | null = null;
      while (route) {
        if (route.snapshot.params['uuid']) {
          foundUuid = route.snapshot.params['uuid'];
          break;
        }
        if (route.firstChild) {
          route = route.firstChild;
        } else {
          break;
        }
      }

      const previousUuid = this.uuid;
      this.uuid = foundUuid;
      console.log('URL changed. UUID:', this.uuid, 'QueryParams:', queryParams);

      if (this.uuid && this.uuid !== 'undefined' && currentRoute.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)) {
        // Opening a different periodical that carries no query: clear any stale search
        // term so the filters autocomplete doesn't show the previous periodical's value.
        if (previousUuid && previousUuid !== this.uuid && !queryParams['query']) {
          this.resetSearchTerm();
        }
        if (!queryParams['sortBy']) {
          this.changeSortBy(SolrSortFields.dateMin, SolrSortDirections.asc, true);
          return;
        }
        this.dispatchPeriodicalSearch(Object.keys(queryParams).length ? queryParams : null);
      }
    });

    this.document$.pipe(
      filter(Boolean),
      takeUntil(this.destroy$)
    ).subscribe(doc => {
      console.log('document loaded:', doc);
      // Only handle document if we're not in search results mode to prevent conflicts
      const queryParams = this.route.snapshot.queryParams;
      const hasSearchQuery = queryParams && queryParams['query'] && queryParams['query'].length > 0;

      if (!hasSearchQuery) {
        this.handleDocument(doc);
      }
    });

    this.initialized = true;
  }


  private dispatchPeriodicalSearch(params: any): void {

    console.log('uuid:', this.uuid);

    if (!this.uuid || this.uuid === 'undefined') return;

    const query = (params && (params['query'] || params['fulltext'])) || '';

    if (query && query.length > 0) {
      this.inputSearchTerm = query;
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

    // CDK aggregator: when a concrete member-library source is selected (metadata
    // sidebar selector, persisted in ?source=), scope the child grid + facets to it.
    // ALL_SOURCES / no source ⇒ null ⇒ unscoped aggregated view (current behavior).
    const cdkCollection = this.configService.isCdk() ? (params?.['source'] || null) : null;

    let baseFilters = this.queryParamsService.getFilters(params);
    let customFilters = this.customSearchService.getSolrFqFilters(this.POSSIBLE_FILTERS);

    // we only need to check if customFilters contains licenses.facet and also basFilters contains licenses.facet, if so, we need to remove it from customFilters
    // so delete all custom filters that contain 'licenses.facet'
    if (baseFilters.some(f => f.includes(facetKeysEnum.license)) && customFilters.some(f => f.includes(facetKeysEnum.license))) {
      customFilters = customFilters.filter(f => !f.includes(facetKeysEnum.license));
    }

    // secure check, if hasSubmittedQuery is false, there cannot be filter model:page, so we need to remove it from customFilters as well as baseFilters
    if (!this.hasSubmittedQuery()) {
      customFilters = customFilters.filter(f => !f.includes(`${facetKeysEnum.model}:page`));
      baseFilters = baseFilters.filter(f => !f.includes(`${facetKeysEnum.model}:page`));
    }

    // similar check for periodicalitem
    if (!this.filtersContainDate()) {
      customFilters = customFilters.filter(f => !f.includes(`${facetKeysEnum.model}:periodicalitem`));
      baseFilters = baseFilters.filter(f => !f.includes(`${facetKeysEnum.model}:periodicalitem`));
    }

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

    this.inputSearchTerm = query;
    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    let filters: string[];

    console.log('customFilters:', customFilters);

    filters = [...baseFilters, ...customFilters];

    // Date filter uses interval overlap on date.min/date.max so it matches both
    // issues (single-day range) and yearly volumes spanning the requested date.
    const finalAdvancedQuery = appendToAdvancedQuery(
      appendToAdvancedQuery(advancedQuery || '', buildYearRangeQuery(params || {})),
      buildDateOverlapQuery(params || {})
    ) || '';

    if (!query) {
      this.store.dispatch(loadPeriodical({ uuid: this.uuid, filters: filters, advancedQuery: finalAdvancedQuery, page: (page - 1) * pageSize, pageCount: pageSize, sortBy, sortDirection, cdkCollection }));
      return;
    }

    console.log('query periodical:', query);
    console.log('advanced query:', finalAdvancedQuery);

    // The search effect only loads results + facets, not the root periodical
    // document/metadata. On a fresh reload with a query in the URL the store is
    // empty, so the header and metadata sidebar would have no document to render.
    // Load it here when it isn't already in the store for this uuid.
    if (this.metadata?.uuid !== this.uuid) {
      this.store.dispatch(loadPeriodical({ uuid: this.uuid, filters, advancedQuery: finalAdvancedQuery, page: (page - 1) * pageSize, pageCount: pageSize, sortBy, sortDirection, cdkCollection }));
    }

    this.store.dispatch(loadPeriodicalSearchResults({
      uuid: this.uuid,
      query: query,
      filters: filters,
      advancedQuery: finalAdvancedQuery,
      advancedQueryMainOperator,
      page: (page - 1) * pageSize,
      pageCount: pageSize,
      sortBy,
      sortDirection
    }));

    this.viewMode.set(ViewMode.SearchResults);
  }


  get document() { return this.documentSignal(); }
  get metadata() { return this.metadataSignal(); }

  // Implementation of abstract methods from BaseFilterService
  getBaseFilters(): Observable<string[]> {
    return of([] as string[]); // No base filters for periodicals, only custom ones
  }

  getFacets(): Observable<any> {
    return this.store.select(selectPeriodicalSearchStateFacets);
  }

  // Periodical's "show more" dialog uses the inherited default (replays the captured
  // request). It does not capture a scoped FacetRequest yet — the inline facets are
  // computed over a specific child model (model:page) in a multi-level structure, so
  // a simple parent scope wouldn't match. Until that's modelled, the dialog falls
  // back to the unscoped index (pre-existing behavior; no regression).

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('[PeriodicalService] getting suggestions for:', term);
    return this.solrService.getAutocompleteSuggestions(term);
  }

  private resetSearchTerm(): void {
    this.inputSearchTerm = '';
    this._searchTerm.set('');
    this._submittedTerm.set('');
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

  /**
   * CDK aggregator: select the member-library source for this periodical. Persisting it
   * in `?source=` re-triggers the route subscription, which re-runs dispatchPeriodicalSearch
   * re-scoped to `cdk.collection:<source>`. The ALL_SOURCES sentinel (and empty) clears the
   * param, restoring the unscoped (aggregated) view. Reset to page 1 — the result set changes.
   */
  setCdkSource(source: string): void {
    this._page.set(1);
    const sourceParam = source && source !== ALL_SOURCES ? source : null;
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { source: sourceParam, page: 1 },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  override get hasSubmittedQuery() {
    return computed(() => this._submittedTerm().trim().length > 0);
  }

  override get filtersContainDate() {
    return computed(() => {
      const params = this.route.snapshot.queryParams;
      const filters = this.queryParamsService.getFilters(params);
      return filters.some(f => f.toLowerCase().includes('date')) ||
        this.advancedSearchService.filtersContainDate();
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

  handleDocument(doc: any): void {
    const model = doc.model;
    const dateStr = doc['date.str'] ?? null;

    // Check current route to prevent overriding search results view during navigation
    const queryParams = this.route.snapshot.queryParams;
    const hasSearchQuery = queryParams && queryParams['query'] && queryParams['query'].length > 0;

    if (hasSearchQuery || this.hasSubmittedQuery()) {
      // In search mode the view must stay on the search results. Return early so
      // the stored-view restore below can't clobber it back to the years grid.
      this.viewMode.set(ViewMode.SearchResults);
      this.setSelectedYear(null);
      return;
    }

    if (model === 'periodical') {
      this.viewMode.set(ViewMode.Timeline);
      this.setSelectedYear(null);
    } else if (model === 'periodicalvolume') {
      // A date filter outside this volume's year would leave the view empty;
      // jump back to the years timeline (keeping the filter) instead.
      if (this.dateFilterMissesVolume()) {
        const rootPid = this.metadata?.rootPid;
        if (rootPid && rootPid !== this.uuid) {
          this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, rootPid], { queryParamsHandling: 'preserve' });
          return;
        }
      }
      this.setSelectedYear(dateStr);
      this.viewMode.set(ViewMode.Calendar);
    }

    const storedView = this.loadViewModeFromLocalStorage();
    this.setView(storedView);
  }

  /**
   * True when a dateFrom/dateTo filter is active but its year span does not
   * overlap the currently opened volume's year(s) — the issue list would be
   * empty, so the caller should navigate back to the years timeline.
   */
  private dateFilterMissesVolume(): boolean {
    const { dateFrom, dateTo } = normalizeDateRangeParams(this.route.snapshot.queryParams);
    if (!dateFrom && !dateTo) return false;

    const meta = this.metadata;
    const volStart = meta?.dateRangeStartYear ?? parseInt(meta?.dateStr ?? '', 10);
    const volEnd = meta?.dateRangeEndYear ?? volStart;
    if (!Number.isFinite(volStart)) return false;

    const fromYear = dateFrom ? parseInt(dateFrom.slice(0, 4), 10) : null;
    const toYear = dateTo ? parseInt(dateTo.slice(0, 4), 10) : null;
    const overlaps = (toYear === null || volStart <= toYear) && (fromYear === null || volEnd >= fromYear);
    return !overlaps;
  }

  /**
   * When a date filter within a single year leaves exactly one matching year
   * on the years level, open that year's calendar directly (filter preserved).
   */
  private maybeAutoOpenSingleYear(): void {
    if (this.metadata?.model !== 'periodical') return;
    if (this.hasSubmittedQuery()) return;

    const { dateFrom, dateTo } = normalizeDateRangeParams(this.route.snapshot.queryParams);
    if (!dateFrom || !dateTo) return;
    if (dateFrom.slice(0, 4) !== dateTo.slice(0, 4)) return;
    if (this.availableYears.length !== 1) return;

    const pid = this.availableYears[0].pid;
    if (pid && pid !== this.uuid) {
      this.router.navigate([APP_ROUTES_ENUM.PERIODICAL_VIEW, pid], { queryParamsHandling: 'preserve' });
    }
  }

  setView(view: string): void {
    this.saveViewModeToLocalStorage(view);
    const hasSelectedYear = !!this.selectedYear();

    // Map view toggle values to ViewMode
    // Years level: 'timeline' | 'grid'
    // Issues level: 'calendar' | 'cards'
    let newView: ViewMode;
    switch (view) {
      case 'timeline':
        newView = hasSelectedYear ? ViewMode.Calendar : ViewMode.Timeline;
        break;
      case 'grid':
        newView = hasSelectedYear ? ViewMode.GridIssues : ViewMode.GridYears;
        break;
      case 'calendar':
        newView = hasSelectedYear
          ? (this.canShowCalendar() ? ViewMode.Calendar : ViewMode.GridIssues)
          : ViewMode.Timeline;
        break;
      case 'cards':
        newView = hasSelectedYear ? ViewMode.GridIssues : ViewMode.GridYears;
        break;
      default:
        newView = hasSelectedYear ? ViewMode.Calendar : ViewMode.Timeline;
    }
    this.viewMode.set(newView);
  }

  goToPreviousYear(): void { this.navigateToRelativeYear(-1); }
  goToNextYear(): void { this.navigateToRelativeYear(1); }

  getCurrentPeriodicalIssueDate(): string | null {
    return this.document?.['date.str'] ?? null;
  }

  private navigateToRelativeYear(offset: number): void {
    if (!this.selectedYear() || this.availableYears.length === 0) {
      console.log('Early return: no selected year or no available years');
      return;
    }

    const currentIndex = this.availableYears.findIndex(y => y.year === this.selectedYear());
    const target = this.availableYears[currentIndex + offset];
    if (target) {
      this.selectYear(target.year);
    } else {
      console.log('No target found for offset:', offset);
    }
  }

  selectYear(year: string): void {
    this.setSelectedYear(year);
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
      .map(y => ({ ...y, exists: true }))
    //.sort((a, b) => parseInt(a.year) - parseInt(b.year));
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

  // Lazy loading methods for calendar months
  loadMonthIssues(year: string, month: number): Observable<any[]> {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;

    if (this.monthlyIssuesCache.has(monthKey)) {
      return of(this.monthlyIssuesCache.get(monthKey) || []);
    }

    if (this.loadingMonths.has(monthKey)) {
      return of([]);
    }

    this.loadingMonths.add(monthKey);
    this.monthlyIssuesLoading.set(true);

    // TODO: Implement actual API call to load issues for specific month
    // This is a skeleton - replace with real implementation
    return this.fetchMonthIssuesFromAPI(year, month).pipe(
      map(issues => {
        this.monthlyIssuesCache.set(monthKey, issues);
        this.loadingMonths.delete(monthKey);

        if (this.loadingMonths.size === 0) {
          this.monthlyIssuesLoading.set(false);
        }

        return issues;
      })
    );
  }

  private fetchMonthIssuesFromAPI(year: string, month: number): Observable<any[]> {
    // TODO: Replace with actual API call
    // For now, return empty array to maintain functionality
    console.log(`Skeleton: Would fetch issues for ${year}-${month}`);
    return of([]);
  }

  getMonthIssuesFromCache(year: string, month: number): any[] {
    const monthKey = `${year}-${month.toString().padStart(2, '0')}`;
    return this.monthlyIssuesCache.get(monthKey) || [];
  }

  clearMonthlyCache(): void {
    this.monthlyIssuesCache.clear();
    this.loadingMonths.clear();
  }
}
