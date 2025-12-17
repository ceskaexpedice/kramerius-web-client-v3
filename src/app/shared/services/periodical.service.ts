import {computed, effect, inject, Injectable, signal} from '@angular/core';
import {ActivatedRoute, NavigationEnd} from '@angular/router';
import {Store} from '@ngrx/store';
import {filter, map, Observable, of, take, takeUntil} from 'rxjs';
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
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {SolrService} from '../../core/solr/solr.service';
import {loadPeriodicalSearchResults} from '../../modules/periodical/state/periodical-search/periodical-search.actions';
import {
  selectPeriodicalSearchStateFacets,
  selectPeriodicalSearchStateResults,
  selectPeriodicalSearchStateTotalCount,
} from '../../modules/periodical/state/periodical-search/periodical-search.selectors';
import {customDefinedFacetsEnum, facetKeysEnum} from '../../modules/search-results-page/const/facets';
import {AdvancedSearchService} from './advanced-search.service';
import {BaseFilterService} from './base-filter.service';
import {SearchService} from './search.service';

@Injectable()
export class PeriodicalService extends BaseFilterService {
  uuid: string | null = null;
  private readonly PERIODICAL_VIEW_LOCAL_STORAGE_KEY = 'periodicalViewMode';

  viewMode = signal<ViewMode>(ViewMode.Timeline);
  activeCalendarGridControl = signal<CalendarGridControl>('calendar');
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

  document$ = this.store.select(selectPeriodicalDocument);
  availableYears$ = this.store.select(selectAvailableYears);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);
  loading$ = this.store.select(selectPeriodicalLoading);
  metadata$ = this.store.select(selectPeriodicalMetadata);
  error$ = this.store.select(selectPeriodicalError);
  searchResults$ = this.store.select(selectPeriodicalSearchStateResults);

  private documentSignal = toSignal(this.document$, {initialValue: null});
  private metadataSignal = toSignal(this.metadata$, {initialValue: null});

  POSSIBLE_FILTERS = [customDefinedFacetsEnum.accessibility, facetKeysEnum.license, 'dateFrom', 'dateTo', 'dateOffset', 'yearFrom', 'yearTo'];




  private solrService = inject(SolrService);
  override advancedSearchService = inject(AdvancedSearchService);
  private searchService = inject(SearchService);

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

    if (this.availableYears$) {
      this.availableYears$.pipe(
        filter(Boolean),
        takeUntil(this.destroy$),
        map(data => {
          this.availableYears = data;
          this.generateYearsFromAvailable();
        }),
      ).subscribe();
    }

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });

  }


  async initialize() {
    if (this.initialized) return;

    // if there is no sortBy in query params, set default sort
    if (!this.route.snapshot.queryParams['sortBy']) {
      this.changeSortBy(SolrSortFields.dateMin, SolrSortDirections.asc);
    }

    this.customSearchService.initializeFromRoute();

    const extractUuid = (url: string): string | null => {
      const match = url.match(/(uuid:[a-f0-9\-]+)/i);
      return match?.[1] ?? null;
    };

    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      const rawUrl = this.router.url;
      const currentRoute = rawUrl.split('?')[0];
      const queryParams = this.route.snapshot.queryParams;

      this.uuid = extractUuid(rawUrl);
      console.log('URL changed. UUID:', this.uuid, 'QueryParams:', queryParams);

      if (currentRoute.includes(APP_ROUTES_ENUM.PERIODICAL_VIEW)) {
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

    if (!this.uuid) return;

    const query = params && params['query'] || '';

    if (query && query.length > 0) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

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

    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    let filters: string[];

    console.log('customFilters:', customFilters);

    filters = [...baseFilters, ...customFilters];

    // Handle year range filter as a separate advanced query
    const yearFrom = params && params['yearFrom'];
    const yearTo = params && params['yearTo'];

    // Handle date range filter as a separate advanced query
    const dateFrom = params && params['dateFrom'];
    const dateTo = params && params['dateTo'];

    let finalAdvancedQuery = advancedQuery || '';

    // Add year range query
    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ? parseInt(yearFrom, 10) : 0;
      const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
      const yearRangeQuery = `(date_range_start.year:[${from} TO ${to}] OR date_range_end.year:[${from} TO ${to}])`;

      if (finalAdvancedQuery && finalAdvancedQuery.length > 0) {
        // Combine existing advanced query with year range
        finalAdvancedQuery = `${finalAdvancedQuery} AND ${yearRangeQuery}`;
      } else {
        // Just use year range as advanced query
        finalAdvancedQuery = yearRangeQuery;
      }
    }

    // Add date range query using separate date components
    if (dateFrom || dateTo) {
      let dateRangeQuery = '';

      if (dateFrom && dateTo) {
        // Both dates provided - parse dates to get components
        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);

        const fromDay = fromDate.getDate();
        const fromMonth = fromDate.getMonth() + 1; // getMonth() returns 0-11
        const fromYear = fromDate.getFullYear();

        const toDay = toDate.getDate();
        const toMonth = toDate.getMonth() + 1;
        const toYear = toDate.getFullYear();

        // Build comprehensive date range query
        if (fromYear === toYear && fromMonth === toMonth) {
          // Same year and month - simple day range
          dateRangeQuery = `(date_range_start.year:${fromYear} AND date_range_start.month:${fromMonth} AND date_range_start.day:[${fromDay} TO ${toDay}])`;
        } else if (fromYear === toYear) {
          // Same year, different months
          const parts = [];
          if (fromMonth === toMonth) {
            parts.push(`(date_range_start.month:${fromMonth} AND date_range_start.day:[${fromDay} TO ${toDay}])`);
          } else {
            // First month (from day to end of month)
            parts.push(`(date_range_start.month:${fromMonth} AND date_range_start.day:[${fromDay} TO 31])`);
            // Middle months (if any)
            if (toMonth - fromMonth > 1) {
              parts.push(`(date_range_start.month:[${fromMonth + 1} TO ${toMonth - 1}])`);
            }
            // Last month (from start of month to day)
            parts.push(`(date_range_start.month:${toMonth} AND date_range_start.day:[1 TO ${toDay}])`);
          }
          dateRangeQuery = `(date_range_start.year:${fromYear} AND (${parts.join(' OR ')}))`;
        } else {
          // Different years
          const parts = [];
          // First year (from month/day to end of year)
          parts.push(`(date_range_start.year:${fromYear} AND ((date_range_start.month:${fromMonth} AND date_range_start.day:[${fromDay} TO 31]) OR date_range_start.month:[${fromMonth + 1} TO 12]))`);
          // Middle years (if any)
          if (toYear - fromYear > 1) {
            parts.push(`(date_range_start.year:[${fromYear + 1} TO ${toYear - 1}])`);
          }
          // Last year (from start of year to month/day)
          parts.push(`(date_range_start.year:${toYear} AND ((date_range_start.month:[1 TO ${toMonth - 1}]) OR (date_range_start.month:${toMonth} AND date_range_start.day:[1 TO ${toDay}])))`);
          dateRangeQuery = `(${parts.join(' OR ')})`;
        }
      } else if (dateFrom) {
        // Only from date provided
        const fromDate = new Date(dateFrom);
        const fromDay = fromDate.getDate();
        const fromMonth = fromDate.getMonth() + 1;
        const fromYear = fromDate.getFullYear();

        dateRangeQuery = `((date_range_start.year:${fromYear} AND ((date_range_start.month:${fromMonth} AND date_range_start.day:[${fromDay} TO 31]) OR date_range_start.month:[${fromMonth + 1} TO 12])) OR date_range_start.year:[${fromYear + 1} TO *])`;
      } else if (dateTo) {
        // Only to date provided
        const toDate = new Date(dateTo);
        const toDay = toDate.getDate();
        const toMonth = toDate.getMonth() + 1;
        const toYear = toDate.getFullYear();

        dateRangeQuery = `((date_range_start.year:[* TO ${toYear - 1}]) OR (date_range_start.year:${toYear} AND ((date_range_start.month:[1 TO ${toMonth - 1}]) OR (date_range_start.month:${toMonth} AND date_range_start.day:[1 TO ${toDay}]))))`;
      }

      if (finalAdvancedQuery && finalAdvancedQuery.length > 0) {
        // Combine existing advanced query with date range
        finalAdvancedQuery = `${finalAdvancedQuery} AND ${dateRangeQuery}`;
      } else {
        // Just use date range as advanced query
        finalAdvancedQuery = dateRangeQuery;
      }
    }

    if (!query) {
      this.store.dispatch(loadPeriodical({ uuid: this.uuid, filters: filters, advancedQuery: finalAdvancedQuery, page: (page - 1) * pageSize, pageCount: pageSize, sortBy, sortDirection }));
      return;
    }

    console.log('query periodical:', query);
    console.log('advanced query:', finalAdvancedQuery);

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
      this.viewMode.set(ViewMode.SearchResults);
      this.setSelectedYear(null);
    } else {
      if (model === 'periodical') {
        this.viewMode.set(ViewMode.Timeline);
        this.setSelectedYear(null);
      } else if (model === 'periodicalvolume') {
        this.setSelectedYear(dateStr);
        this.viewMode.set(ViewMode.Calendar);
      }
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
      .map(y => ({...y, exists: true}))
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
