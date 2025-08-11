import {computed, effect, Injectable} from '@angular/core';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {filter, map, Observable, takeUntil} from 'rxjs';
import {Store} from '@ngrx/store';
import {
  selectActiveFilters,
  selectFacets, selectNonPageSearchResults, selectPageSearchResults,
  selectSearchResults,
  selectSearchResultsTotalCount,
} from '../../modules/search-results-page/state/search.selectors';
import {SearchDocument} from '../../modules/models/search-document';
import {loadSearchResults} from '../../modules/search-results-page/state/search.actions';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {SolrService} from '../../core/solr/solr.service';
import {AdvancedSearchService} from './advanced-search.service';
import { toSignal } from '@angular/core/rxjs-interop';
import {facetKeysEnum} from '../../modules/search-results-page/const/facets';
import {BaseFilterService} from './base-filter.service';
import {QueryParamsService} from '../../core/services/QueryParamsManager';
import {CustomSearchService} from './custom-search.service';
import {UserService} from './user.service';

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
  pageResults$: Observable<SearchDocument[]>;
  totalCount$: Observable<number>;
  activeFilters$: Observable<string[]>;

  inputSearchTerm = '';

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

  constructor(
    private store: Store,
    private solrService: SolrService,
    private advancedSearchService: AdvancedSearchService
  ) {
    super();
    this.load();

    this.results$ = this.store.select(selectSearchResults);
    this.pageResults$ = this.store.select(selectPageSearchResults);
    this.nonPageResults$ = this.store.select(selectNonPageSearchResults);

    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);
    this.activeFilters$ = this.store.select(selectActiveFilters);

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });
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
    this.initialize();
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


  async initialize() {
    if (this.initialized) return;

    this.customSearchService.initializeFromRoute();

    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      const currentRoute = this.router.url.split('?')[0];
      if (currentRoute === `/${APP_ROUTES_ENUM.SEARCH_RESULTS}`) {

        this.advancedSearchService.resetFromParams(params);

        this.dispatchSearch(params);
      }
    });

    this.initialized = true;
  }

  private dispatchSearch(params: any): void {
    if (Object.keys(params).length === 0) return;

    console.log('dispatching search with params:', params)

    const query = params['query'] || '';

    if (query && query.length > 0 && !this.hasSubmittedQuery()) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

    let baseFilters = this.queryParamsService.getFilters(params);
    let customFilters = this.customSearchService.getSolrFqFilters();

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

    console.log('advancedQuery:', advancedQuery);

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

    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    let filters: string[];

    filters = [...baseFilters, ...customFilters];

    this.store.dispatch(loadSearchResults({
      query,
      filters,
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

  backupCurrentSearchUrl(): void {
    const currentUrl = this.router.url;
    sessionStorage.setItem(this.SEARCH_BACKUP_KEY, currentUrl);
  }

  getBackupSearchUrl(): string | null {
    return sessionStorage.getItem(this.SEARCH_BACKUP_KEY);
  }

  clearBackupSearchUrl(): void {
    sessionStorage.removeItem(this.SEARCH_BACKUP_KEY);
  }


  override get filtersContainDate() {
    return computed(() =>
      this._activeFiltersSignal().some(f => f.toLowerCase().includes('date')) ||
      this.advancedSearchService.filtersContainDate()
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


}
