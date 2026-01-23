import { computed, effect, Injectable } from '@angular/core';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { ActivatedRoute } from '@angular/router';
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
} from '../../modules/search-results-page/state/search.selectors';
import { SearchDocument } from '../../modules/models/search-document';
import { loadSearchResults } from '../../modules/search-results-page/state/search.actions';
import { SolrOperators, SolrSortFields } from '../../core/solr/solr-helpers';
import { SolrService } from '../../core/solr/solr.service';
import { AdvancedSearchService } from './advanced-search.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { facetKeysEnum, mapFacetsToSearchFields } from '../../modules/search-results-page/const/facets';
import { BaseFilterService } from './base-filter.service';

@Injectable({
  providedIn: 'root',
})
export class SearchService extends BaseFilterService {
  private readonly SEARCH_BACKUP_KEY = 'returnToSearchUrl';

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

    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);
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
        const currentRoute = this.router.url.split('?')[0];
        if (currentRoute === `/${APP_ROUTES_ENUM.SEARCH_RESULTS}`) {
          this.reloadCurrentSearch();
        }
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
          if (currentRoute === `/${APP_ROUTES_ENUM.SEARCH_RESULTS}`) {
            // Update URL and reload search with new page size
            this._page.set(1); // Reset to page 1 when page size changes
            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { page: 1, pageSize: newPageSize },
              queryParamsHandling: 'merge'
            });
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

    this.router.navigate([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`], {
      queryParams
    });

  }

  redirectDirectlyToUrl(url: string): void {
    // url is in format ?query=searchTerm&page=1&pageSize=60&sortBy=relevance&sortDirection=desc
    // redirect to the search results page with the query parameters
    this.initialize();

    window.open(`/${APP_ROUTES_ENUM.SEARCH_RESULTS}${url}`, '_self');
  }

  getRedirectUrl(url: string) {
    return `/${APP_ROUTES_ENUM.SEARCH_RESULTS}${url}`;
  }

  search(query: string): void {
    //this.initialize();
    this.router.navigate([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`], {
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


  // Params that should not trigger a search refresh
  private readonly SETTINGS_PARAMS = ['settings', 'settings_section', 'more_info'];

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
      const currentRoute = this.router.url.split('?')[0];
      if (currentRoute === `/${APP_ROUTES_ENUM.SEARCH_RESULTS}`) {
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

  public dispatchSearch(params: any): void {
    console.log('dispatching search with params:', params)

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

    // Handle year range filter as a separate advanced query
    const yearFrom = params && params['yearFrom'];
    const yearTo = params && params['yearTo'];

    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ? parseInt(yearFrom, 10) : 0;
      const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
      const yearRangeQuery = `(date_range_start.year:[${from} TO ${to}] OR date_range_end.year:[${from} TO ${to}])`;

      if (advancedQuery && advancedQuery.length > 0) {
        // Combine existing advanced query with year range
        advancedQuery = `${advancedQuery} AND ${yearRangeQuery}`;
      } else {
        // Just use year range as advanced query
        advancedQuery = yearRangeQuery;
      }
    }

    // Handle date range filter as a separate advanced query
    const dateFrom = params && params['dateFrom'];
    const dateTo = params && params['dateTo'];

    if (dateFrom || dateTo) {
      let dateRangeQuery = '';

      if (dateFrom && dateTo) {
        // Both dates provided - create range query
        dateRangeQuery = `(date.min:[${dateFrom}T00:00:00Z TO ${dateTo}T23:59:59Z])`;
      } else if (dateFrom) {
        // Only start date provided
        dateRangeQuery = `(date.min:[${dateFrom}T00:00:00Z TO *])`;
      } else if (dateTo) {
        // Only end date provided
        dateRangeQuery = `(date.min:[* TO ${dateTo}T23:59:59Z])`;
      }

      if (dateRangeQuery && advancedQuery && advancedQuery.length > 0) {
        // Combine existing advanced query with date range
        advancedQuery = `${advancedQuery} AND ${dateRangeQuery}`;
      } else if (dateRangeQuery) {
        // Just use date range as advanced query
        advancedQuery = dateRangeQuery;
      }
    }

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

    this.store.dispatch(loadSearchResults({
      query,
      filters,
      filterGroups,
      advancedQuery: advancedQuery,
      advancedQueryMainOperator: advancedQueryMainOperator,
      page: (page - 1) * pageSize, // Solr uses 0-based indexing for pages
      pageCount: pageSize,
      sortBy,
      sortDirection
    }));
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
    const currentUrl = url || this.router.url;
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

    const dummyUrl = new URL('http://url' + backupUrl);

    // clear existing
    const newSearchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      newSearchParams.set(key, params[key]);
    });

    // We keep the pathname from original backupUrl
    const path = dummyUrl.pathname;
    const newUrl = `${path}?${newSearchParams.toString()}`;

    this.backupCurrentSearchUrl(newUrl);
  }

}
