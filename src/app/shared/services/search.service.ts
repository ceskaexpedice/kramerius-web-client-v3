import {effect, Injectable, signal, computed} from '@angular/core';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {ActivatedRoute, Router} from '@angular/router';
import {combineLatest, filter, map, Observable, of} from 'rxjs';
import {Store} from '@ngrx/store';
import {
  selectActiveFilters,
  selectFacets,
  selectSearchResults,
  selectSearchResultsTotalCount,
} from '../../modules/search-results-page/state/search.selectors';
import {SearchDocument} from '../../modules/models/search-document';
import {loadSearchResults} from '../../modules/search-results-page/state/search.actions';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {QueryParamsService} from '../../core/services/QueryParamsManager';
import {SolrService} from '../../core/solr/solr.service';
import {FilterService} from './filter.service';
import {AdvancedSearchService} from './advanced-search.service';
import {UserService} from './user.service';
import {CustomSearchService} from './custom-search.service';
import { toSignal } from '@angular/core/rxjs-interop';
import {facetKeysEnum} from '../../modules/search-results-page/const/facets';

@Injectable({
  providedIn: 'root'
})
export class SearchService implements FilterService {
  private readonly SEARCH_BACKUP_KEY = 'returnToSearchUrl';
  private initialized = false;

  private _searchTerm = signal('');
  private _submittedTerm = signal('');
  private _page = signal(1);
  private _pageSize = signal(60);
  private _totalCount = signal(0);
  private _sortBy = signal(SolrSortFields.relevance);
  private _sortDirection = signal(SolrSortDirections.desc);
  private _activeFiltersSignal = toSignal(
    this.store.select(selectActiveFilters),
    { initialValue: [] }
  );

  results$: Observable<SearchDocument[]>;
  totalCount$: Observable<number>;
  activeFilters$: Observable<string[]>;

  get submittedTerm() { return this._submittedTerm(); }
  get searchTerm() { return this._searchTerm; }
  get page() { return this._page(); }
  get pageSize() { return this._pageSize(); }
  get totalCount() { return this._totalCount(); }
  get sortBy() { return this._sortBy; }
  get sortDirection() { return this._sortDirection; }

  inputSearchTerm = '';

  get selectedTags(): Observable<string[]> {
    return combineLatest([
      this.activeFilters$,
      of(this.submittedTerm)
    ]).pipe(
      map(([filters, term]) => {
        if (term && term.trim().length > 0) {
          return [...filters, `search:${term}`];
        }
        return filters;
      })
    );
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
    private router: Router,
    private route: ActivatedRoute,
    private store: Store,
    private queryParamsService: QueryParamsService,
    private solrService: SolrService,
    private advancedSearchService: AdvancedSearchService,
    private userService: UserService,
    private customSearchService: CustomSearchService
  ) {
    this.results$ = this.store.select(selectSearchResults);
    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);
    this.activeFilters$ = this.store.select(selectActiveFilters);

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });
  }

  getFacets(): Observable<any> {
    return this.store.select(selectFacets);
  }

  getFiltersWithOperators(): Observable<Record<string, SolrOperators>> {
    return this.route.queryParams.pipe(
      map(params => {
        // Get all operators from query parameters
        return this.queryParamsService.getOperators(params);
      })
    );
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

    await this.userService.loadLicenses();

    this.customSearchService.initializeFromRoute();

    this.route.queryParams.subscribe(params => {
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

    const query = params['query'] || '';
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

    const { advancedQuery, advancedQueryMainOperator } = this.advancedSearchService.getAdvancedParams(params);

    const page = Number(params['page']) || this._page();
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
      page: page - 1,
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

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    const [facetKey, value] = fullValue.split(':');
    const params = route.snapshot.queryParams;
    const currentValues = this.queryParamsService.getFiltersByFacet(params, facetKey);

    // Check if the value is already selected
    const isSelected = currentValues.includes(value);

    // Update the values list
    const newValues = isSelected
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    // Get the current operator
    const operator = this.queryParamsService.getOperatorForFacet(params, facetKey);

    // Update the filters
    this.queryParamsService.updateFilters(route, facetKey, newValues, operator);
  }

  removeFilter(filter: string) {
    if (filter.startsWith('search:')) {
      this.queryParamsService.removeSearchTerm(this.route);
      this._searchTerm.set('');
      this._submittedTerm.set('');
    } else {
      this.queryParamsService.removeFilter(this.route, filter);
    }
  }

  removeFieldFilters(field: string) {
    this.queryParamsService.removeFieldFilters(this.route, field);
  }

  resetOperator(field: string) {
    this.queryParamsService.resetOperator(this.route, field);
  }

  clearAllFilters() {
    this.queryParamsService.removeSearchTerm(this.route);
    this._submittedTerm.set('');
    this._searchTerm.set('');
    this.queryParamsService.clearAllFilters(this.route);
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

  changeSortBy(sortBy: SolrSortFields, sortDirection: SolrSortDirections) {
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { sortBy, sortDirection },
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

  get hasSubmittedQuery() {
    return computed(() => this._submittedTerm().trim().length > 0);
  }

  get filtersContainDate() {
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
