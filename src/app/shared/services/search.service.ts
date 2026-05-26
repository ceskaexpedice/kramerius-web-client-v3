import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { Location } from '@angular/common';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { ActivatedRoute, UrlSerializer } from '@angular/router';
import { distinctUntilChanged, filter, map, Observable, Subscription, takeUntil } from 'rxjs';
import { Store } from '@ngrx/store';
import {
  selectActiveFilters,
  selectArticleSearchResults,
  selectAttachmentSearchResults,
  selectFacets,
  selectFacetsLoading,
  selectNonPageSearchResults,
  selectPageSearchResults,
  selectSearchResults,
  selectSearchResultsLoading,
  selectSearchResultsTotalCount,
  selectUnifiedTotalCount,
} from '../../modules/search-results-page/state/search.selectors';
import { SearchDocument } from '../../modules/models/search-document';
import { loadSearchResults } from '../../modules/search-results-page/state/search.actions';
import { SolrOperators, SolrSortFields } from '../../core/solr/solr-helpers';
import { SolrService } from '../../core/solr/solr.service';
import { AdvancedSearchService } from './advanced-search.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { facetKeysEnum, mapFacetsToSearchFields } from '../../modules/search-results-page/const/facets';
import { BaseFilterService } from './base-filter.service';
import { LibraryContextService } from './library-context.service';
import { isMapTab } from '../../modules/search-results-page/const/map-utils';
import { PageSearchService } from './page-search.service';
import { DisplayConfigService } from './display-config.service';
import { appendToAdvancedQuery, buildDateMinRangeQuery, buildYearRangeQuery } from '../utils/date-range-query';

@Injectable({
  providedIn: 'root',
})
export class SearchService extends BaseFilterService {
  private libraryContext = inject(LibraryContextService);
  private pageSearchService = inject(PageSearchService);
  private location = inject(Location);
  private urlSerializer = inject(UrlSerializer);
  private displayConfigService = inject(DisplayConfigService);

  // Tracks the effective grouped state so views (toggle button, etc.) re-render
  // when setGroupResults runs without a router navigation. `null` means "fall
  // back to URL/settings"; populated after the first explicit toggle.
  private _groupedOverride = signal<boolean | null>(null);
  private _suppressGroupReload = false;
  private readonly SEARCH_BACKUP_KEY = 'returnToSearchUrl';

  private isOnSearchResultsRoute(): boolean {
    const currentRoute = this.router.url.split('?')[0];
    const prefix = this.libraryContext.getLibraryPrefix();
    return currentRoute === `${prefix}/${APP_ROUTES_ENUM.SEARCH_RESULTS}`;
  }

  // SearchService-specific properties
  private _activeFiltersSignal = toSignal(
    this.store.select(selectActiveFilters),
    { initialValue: [] }
  );

  results$: Observable<SearchDocument[]>;
  nonPageResults$: Observable<SearchDocument[]>;
  articleResults$: Observable<SearchDocument[]>;
  pageResults$: Observable<SearchDocument[]>;
  attachmentResults$: Observable<SearchDocument[]>;
  loading$: Observable<boolean>;
  override facetsLoading$: Observable<boolean>;
  totalCount$: Observable<number>;
  activeFilters$: Observable<string[]>;

  private queryParamsSubscription: Subscription | null = null;

  // Implementation of abstract methods from BaseFilterService
  getBaseFilters(): Observable<string[]> {
    return this.activeFilters$;
  }

  getFacets(): Observable<any> {
    return this.store.select(selectFacets);
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    this.resetPage();

    const [facetKey, value] = fullValue.split(':');
    const params = route.snapshot.queryParams;
    const currentValues = this.queryParamsService.getFiltersByFacet(params, facetKey);

    const isSelected = currentValues.includes(value);
    const newValues = isSelected
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    const operator = this.queryParamsService.getOperatorForFacet(params, facetKey);

    // Update the filters
    this.queryParamsService.updateFilters(route, facetKey, newValues, operator);
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('[SearchService] getting suggestions for:', term);
    return this.solrService.getAutocompleteSuggestions(term);
  }

  onSearch(term: string | null): void {
    const query = (term && term.length > 0) ? `${term}` : '';
    // reset page to 1
    this._page.set(1);
    if (query.length > 0) {
      this.setSortByToRelevance();
    } else {
      this.setSortByCreated();
    }
    this._submittedTerm.set(query);
    this.search(query);
  }

  onSubmit(term: string): void {
    this.customSearchService.clear();
    this._page.set(1);
    this.onSearch(term);
  }

  onSuggestionSelected(suggestion: string): void {
    this._page.set(1);
    this.setSortByToRelevance();
    this._submittedTerm.set(suggestion);
    this.search(suggestion);
  }

  setSortByToRelevance() {
    this._sortBy.set(SolrSortFields.relevance);
  }

  setSortByCreated() {
    this._sortBy.set(SolrSortFields.createdAt);
  }

  constructor(
    private store: Store,
    private solrService: SolrService,
    override advancedSearchService: AdvancedSearchService
  ) {
    super();
    this.load();

    this.results$ = this.store.select(selectSearchResults);
    this.nonPageResults$ = this.store.select(selectNonPageSearchResults);
    this.articleResults$ = this.store.select(selectArticleSearchResults);
    this.pageResults$ = this.store.select(selectPageSearchResults);
    this.attachmentResults$ = this.store.select(selectAttachmentSearchResults);
    this.loading$ = this.store.select(selectSearchResultsLoading);
    this.facetsLoading$ = this.store.select(selectFacetsLoading);

    this.totalCount$ = this.store.select(selectUnifiedTotalCount);
    this.activeFilters$ = this.store.select(selectActiveFilters);

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });

    // Listen for reload event from settings changes
    this.setupReloadListener();
  }

  /**
   * Sets up listener for reload events triggered by settings changes
   */
  private setupReloadListener(): void {
    this.settingsService.reloadSearchResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        // Only reload if we're on the search results page
        if (this.isOnSearchResultsRoute()) {
          this.reloadCurrentSearch();
        }
      });

    // Listen for page size changes from settings
    let previousPageSize = this._pageSize();
    let previousGroupDefault = this.settingsService.settings.displayConfig?.defaultGroupResults ?? true;
    this.settingsService.settings$
      .pipe(takeUntil(this.destroy$))
      .subscribe(settings => {
        const newPageSize = settings.displayConfig?.defaultPageSize;
        if (newPageSize && newPageSize !== previousPageSize) {
          previousPageSize = newPageSize;
          this._pageSize.set(newPageSize);

          if (this.isOnSearchResultsRoute()) {
            // Update URL and reload search with new page size
            this._page.set(1); // Reset to page 1 when page size changes
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { page: 1, pageSize: newPageSize },
              queryParamsHandling: 'merge'
            });
          }
        }

        const newGroupDefault = settings.displayConfig?.defaultGroupResults ?? true;
        if (newGroupDefault !== previousGroupDefault) {
          previousGroupDefault = newGroupDefault;
          // Skip reload when the change came from the inline toggle — it already
          // updated the URL (via replaceState, which doesn't refresh
          // route.snapshot) and reloaded only the pages section.
          if (this._suppressGroupReload) {
            this._suppressGroupReload = false;
          } else if (this.isOnSearchResultsRoute() && this.route.snapshot.queryParams['group'] === undefined) {
            this.reloadCurrentSearch();
          }
        }
      });
  }

  /**
   * Reloads the current search with existing parameters
   */
  public reloadCurrentSearch(): void {
    const params = this.route.snapshot.queryParams;
    if (params && Object.keys(params).length > 0) {
      this.dispatchSearch(params);
    }
  }


  searchWithFacet(facetKey: string, facetValue: string, customFacet = false): void {
    this.initialize();

    this.customSearchService.clear();

    const queryParams: any = {
      query: this._searchTerm(),
      page: this._page(),
      pageSize: this._pageSize(),
      sortBy: this._sortBy(),
      sortDirection: this._sortDirection()
    };

    if (customFacet) {
      this.customSearchService.addFilter(`${facetKey}:${facetValue}`);
      queryParams['customSearch'] = `${facetKey}:${facetValue}`;
    }

    if (!customFacet) {
      queryParams['fq'] = `${facetKey}:${facetValue}`;
      queryParams[`${facetKey}_operator`] = SolrOperators.or;
    }

    this.router.navigate(this.libraryContext.prependLibraryPrefix([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`]), {
      queryParams
    });

  }

  redirectDirectlyToUrl(url: string): void {
    // url is in format ?query=searchTerm&page=1&pageSize=60&sortBy=relevance&sortDirection=desc
    // redirect to the search results page with the query parameters
    this.initialize();

    const prefix = this.libraryContext.getLibraryPrefix();
    window.open(`${prefix}/${APP_ROUTES_ENUM.SEARCH_RESULTS}${url}`, '_self');
  }

  getRedirectUrl(url: string) {
    const prefix = this.libraryContext.getLibraryPrefix();
    return `${prefix}/${APP_ROUTES_ENUM.SEARCH_RESULTS}${url}`;
  }

  search(query: string): void {
    //this.initialize();
    // A fresh query always opens the All tab — explicitly clear tab + map coords
    // so a submit from the home hero or header search drops any prior map state.
    this.router.navigate(this.libraryContext.prependLibraryPrefix([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`]), {
      queryParams: {
        query,
        page: this._page(),
        pageSize: this._pageSize(),
        sortBy: this._sortBy(),
        sortDirection: this._sortDirection(),
        tab: null,
        north: null,
        south: null,
        east: null,
        west: null,
      },
      queryParamsHandling: 'merge'
    });
  }


  // Params that should not trigger a search refresh
  private readonly SETTINGS_PARAMS = ['settings', 'settings_section', 'more_info', 'north', 'south', 'east', 'west', 'exportPid', 'tab', 'group'];

  private getSearchRelevantParams(params: any): any {
    const relevant: any = {};
    for (const key of Object.keys(params)) {
      if (!this.SETTINGS_PARAMS.includes(key)) {
        relevant[key] = params[key];
      }
    }
    return relevant;
  }

  async initialize() {
    if (this.initialized) return;

    this.queryParamsSubscription = this.route.queryParams.pipe(
      takeUntil(this.destroy$),
      // Only react to changes in search-relevant params, ignore settings dialog params
      distinctUntilChanged((prev, curr) => {
        const prevRelevant = this.getSearchRelevantParams(prev);
        const currRelevant = this.getSearchRelevantParams(curr);
        return JSON.stringify(prevRelevant) === JSON.stringify(currRelevant);
      })
    ).subscribe(params => {
      if (this.isOnSearchResultsRoute()) {
        this.customSearchService.initializeFromRoute();

        this.advancedSearchService.resetFromParams(params);

        this.dispatchSearch(params);
      }
    });

    this.initialized = true;
  }

  cleanup() {
    if (this.queryParamsSubscription) {
      this.queryParamsSubscription.unsubscribe();
      this.queryParamsSubscription = null;
    }
    this.initialized = false;
  }

  /**
   * Resolves whether the current search should be grouped by root.pid.
   * URL `group` param overrides; falls back to settings.defaultGroupResults.
   */
  public isGrouped(params?: any): boolean {
    // Explicit caller-provided params (e.g. from dispatchSearch) win — these
    // come from a fresh URL emission and represent the source of truth for
    // that request.
    if (params) {
      const fromUrl = params['group'];
      if (fromUrl === 'true') return true;
      if (fromUrl === 'false') return false;
      return this.settingsService.settings.displayConfig?.defaultGroupResults ?? true;
    }
    // Otherwise prefer the in-memory override (kept in sync by setGroupResults)
    // so signal-aware bindings re-render after a silent URL update.
    const override = this._groupedOverride();
    if (override !== null) return override;
    const fromUrl = this.route.snapshot.queryParams['group'];
    if (fromUrl === 'true') return true;
    if (fromUrl === 'false') return false;
    return this.settingsService.settings.displayConfig?.defaultGroupResults ?? true;
  }

  /**
   * Toggles the per-search grouping override via the `group` URL param.
   * Only the Pages section is affected — titles/articles/attachments and the
   * main paginator stay untouched. The pages-only request is re-issued.
   */
  public setGroupResults(grouped: boolean): void {
    // Update the `group` URL param in-place via Location.replaceState so the
    // router doesn't re-navigate (which would trigger scroll-to-top and
    // refire the queryParams subscription). The pages-only effect is the
    // only thing that needs to react to the change.
    const tree = this.router.createUrlTree([], {
      relativeTo: this.route,
      queryParams: { group: grouped ? 'true' : 'false' },
      queryParamsHandling: 'merge',
    });
    this.location.replaceState(this.urlSerializer.serialize(tree));
    this._groupedOverride.set(grouped);
    this.pageSearchService.reloadWithGrouped(grouped);

    // Persist the new default so it survives reloads and pre-selects in the
    // settings dialog. The settings$ listener skips reloading because the
    // `group` URL param is now set above.
    const current = this.settingsService.settings;
    if ((current.displayConfig?.defaultGroupResults ?? true) !== grouped) {
      const displayConfig = current.displayConfig
        ? { ...current.displayConfig, defaultGroupResults: grouped }
        : { ...this.displayConfigService.getConfigForSettings(), defaultGroupResults: grouped };
      this._suppressGroupReload = true;
      this.settingsService.settings = { ...current, displayConfig };
    }
  }

  public dispatchSearch(params: any): void {
    // In map mode, still sync query/sort state but skip the regular search
    if (isMapTab(params)) {
      const query = params['query'] || '';
      if (query && query.length > 0 && !this.hasSubmittedQuery()) {
        this._searchTerm.set(query);
        this._submittedTerm.set(query);
      }
      if (params['sortBy']) this._sortBy.set(params['sortBy']);
      if (params['sortDirection']) this._sortDirection.set(params['sortDirection']);
      return;
    }

    const query = params['query'] || '';

    // If no params exist, add default params to URL
    if (Object.keys(params).length === 0) {
      const defaultParams = {
        page: this._page(),
        pageSize: this._pageSize(),
        sortBy: this._sortBy(),
        sortDirection: this._sortDirection()
      };
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: defaultParams,
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
      return;
    }

    if (query && query.length > 0 && !this.hasSubmittedQuery()) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

    let baseFilters = this.queryParamsService.getFilters(params);
    let customFilters = this.customSearchService.getSolrFqFilters();

    console.log('customFilters:', customFilters);

    // if we have license filter in both baseFilters and customFilters operator between them is AND


    // if (baseFilters.some(f => f.includes(facetKeysEnum.license)) && customFilters.some(f => f.includes(facetKeysEnum.license))) {
    //   customFilters = customFilters.filter(f => !f.includes(facetKeysEnum.license));
    // }

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

    let { advancedQuery, advancedQueryMainOperator } = this.advancedSearchService.getAdvancedParams(params);
    advancedQuery = appendToAdvancedQuery(advancedQuery, buildYearRangeQuery(params));
    advancedQuery = appendToAdvancedQuery(advancedQuery, buildDateMinRangeQuery(params));

    let page = 1;

    if (!this._pageReset()) {
      page = Number(params['page']) || this._page();
    } else {
      this._pageReset.set(false);
      const paramsPage = Number(params['page']);
      // If page is undefined (implicit 1) or already 1, we don't need to navigate/wait for router.
      if (paramsPage && paramsPage !== 1) {
        this.goToPage(page);
        return;
      }
      // If we are already on page 1, continue to search
    }

    const pageSize = Number(params['pageSize']) || this._pageSize();
    const sortBy = params['sortBy'] || this._sortBy();
    const sortDirection = params['sortDirection'] || this._sortDirection();

    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    // Create filter groups for AND logic between baseFilters and customFilters
    // Each group becomes separate fq params (AND between groups, OR within groups)
    const filterGroups = [
      mapFacetsToSearchFields(baseFilters),
      mapFacetsToSearchFields(customFilters)
    ].filter(g => g.length > 0);

    // Combine all filters for backwards compatibility and facet calculations
    let filters = [...mapFacetsToSearchFields(baseFilters), ...mapFacetsToSearchFields(customFilters)];

    // If no search query is present, filter for standalone collections
    // AND check if we are actually filtering for collections
    if ((!query || query.trim() === '') && filters.some(f => f.includes('root.model:collection'))) {
      filters.push('collection.is_standalone:true');
      // Also add to filterGroups
      if (filterGroups.length > 0) {
        filterGroups[filterGroups.length - 1].push('collection.is_standalone:true');
      } else {
        filterGroups.push(['collection.is_standalone:true']);
      }
    }

    const isGrouped = this.isGrouped(params);
    // A fresh URL emission is the source of truth — clear any prior in-memory
    // override so subsequent isGrouped() calls (without params) follow the URL.
    this._groupedOverride.set(isGrouped);

    this.store.dispatch(loadSearchResults({
      query,
      filters,
      filterGroups,
      advancedQuery: advancedQuery,
      advancedQueryMainOperator: advancedQueryMainOperator,
      page: (page - 1) * pageSize, // Solr uses 0-based indexing for pages
      pageCount: pageSize,
      sortBy,
      sortDirection,
      grouped: isGrouped
    }));
    // Pages-only follow-up is fired by triggerPageSearchAfterMain$ once
    // titlesTotal is known, sized to fill the remainder of this window.
  }

  updateFilters(
    route: ActivatedRoute,
    facetKey: string,
    selectedValues: string[],
    useAndOperator: boolean = false
  ): void {
    const operator = useAndOperator ? SolrOperators.and : SolrOperators.or;
    this.queryParamsService.updateFilters(route, facetKey, selectedValues, operator);
  }

  getFiltersByFacet(facet: string): Observable<string[]> {
    return this.activeFilters$.pipe(
      map(filters => filters.filter(filter => filter.startsWith(facet + ':')))
    );
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

  isSelectedFacetItem(itemName: string): Observable<boolean> {
    return this.activeFilters$.pipe(
      map(filters => filters.includes(itemName))
    );
  }

  backupCurrentSearchUrl(url: string | null = null): void {
    // Use Location.path() instead of router.url: the grouping toggle updates the
    // `group` param via location.replaceState (see setGroupResults), which does
    // not refresh router.url. location.path() reflects the real address bar.
    const currentUrl = url || this.location.path();
    sessionStorage.setItem(this.SEARCH_BACKUP_KEY, currentUrl);
  }

  getBackupSearchUrl(): string | null {
    return sessionStorage.getItem(this.SEARCH_BACKUP_KEY);
  }

  clearBackupSearchUrl(): void {
    sessionStorage.removeItem(this.SEARCH_BACKUP_KEY);
  }

  urlContainsDate(): boolean {
    // check if url contains yearFrom or yearTo or dateFrom or dateTo
    const params = this.route.snapshot.queryParams;
    return params['yearFrom'] !== undefined || params['yearTo'] !== undefined ||
      params['dateFrom'] !== undefined || params['dateTo'] !== undefined;
  }

  override get filtersContainDate() {
    return computed(() =>
      this._activeFiltersSignal().some(f => f.toLowerCase().includes('date')) ||
      this.advancedSearchService.filtersContainDate() ||
      this.customSearchService.filtersContainDateOrYearRange || this.urlContainsDate()
    );
  }

  get activeFiltersSnapshot(): string[] {
    return this._activeFiltersSignal();
  }

  isSelectedFilter(facetKey: string, value: string): boolean {
    return this._activeFiltersSignal().includes(`${facetKey}:${value}`);
  }

  getValueBySelectedFilter(facetKey: string): string | null {
    const filter = this._activeFiltersSignal().find(f => f.startsWith(`${facetKey}:`));
    return filter ? filter.split(':')[1] : null;
  }

  toggleRadioFilter(route: ActivatedRoute, facetKey: string, value: string) {
    // Remove any existing filter for this facetKey
    const currentFilters = this._activeFiltersSignal().filter(f => !f.startsWith(`${facetKey}:`));

    // Add the new value
    const updatedFilters = [...currentFilters, `${facetKey}:${value}`];

    const operator = this.queryParamsService.getOperatorForFacet(route.snapshot.queryParams, facetKey);

    this.queryParamsService.updateFilters(route, facetKey, [value], operator);
  }


  /**
   * Updates only the local state and backup URL, then dispatches search.
   * Does NOT update the browser URL.
   */
  goToPageLocal(page: number): void {
    const params = this.getParamsFromBackupUrl();
    if (!params) return;

    params['page'] = page;

    // Update backup URL so if we return to search, we are on the correct page
    this.updateBackupUrlWithParams(params);
    this.dispatchSearch(params);
  }

  /**
   * Updates only the local state and backup URL, then dispatches search.
   * Does NOT update the browser URL.
   */
  changePageSizeLocal(size: number): void {
    const params = this.getParamsFromBackupUrl();
    if (!params) return;

    params['pageSize'] = size;
    params['page'] = 1; // Reset to page 1 on size change

    // Update backup URL
    this.updateBackupUrlWithParams(params);
    this.dispatchSearch(params);
  }

  private getParamsFromBackupUrl(): any {
    const backupUrl = this.getBackupSearchUrl();
    if (!backupUrl) return null;

    // backupUrl contains path + query, e.g. /search-results?query=foo
    // We need to parse query params
    const dummyUrl = new URL('http://url' + backupUrl);
    const params: any = {};
    dummyUrl.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  }

  private updateBackupUrlWithParams(params: any): void {
    const backupUrl = this.getBackupSearchUrl();
    if (!backupUrl) return;

    // Keep the pathname from the original backupUrl, swap in the new params.
    const path = backupUrl.split('?')[0];

    // Serialize via the router so the result matches the readable form used
    // everywhere else (`:` and `,` stay unencoded). URLSearchParams.toString()
    // would percent-encode them (%3A/%2C), corrupting the customSearch value
    // when the back/home button navigates to this URL.
    const tree = this.router.createUrlTree([path], { queryParams: params });

    this.backupCurrentSearchUrl(this.urlSerializer.serialize(tree));
  }

}
