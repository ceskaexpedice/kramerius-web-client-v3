import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Observable, of, takeUntil } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { SolrService } from '../../core/solr/solr.service';
import { customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { AdvancedSearchService } from './advanced-search.service';
import { BaseFilterService } from './base-filter.service';
import {
  selectCollectionSearchResults,
  selectCollectionSearchResultsTotalCount,
  selectCollectionSearchResultsLoading,
  selectCollectionSearchResultsError,
  selectCollectionFacets
} from '../state/collections/collections.selectors';
import { loadCollectionSearchResults } from '../state/collections/collections.actions';

@Injectable()
export class CollectionsService extends BaseFilterService {
  uuid: string | null = null;

  inputSearchTerm = '';

  totalCount$ = this.store.select(selectCollectionSearchResultsTotalCount);
  loading$ = this.store.select(selectCollectionSearchResultsLoading);
  searchResults$ = this.store.select(selectCollectionSearchResults);
  error$ = this.store.select(selectCollectionSearchResultsError);

  POSSIBLE_FILTERS = [
    customDefinedFacetsEnum.accessibility,
    facetKeysEnum.license,
    facetKeysEnum.model,
    'dateFrom',
    'dateTo'
  ];

  private solrService = inject(SolrService);
  override advancedSearchService = inject(AdvancedSearchService);

  constructor(
    private store: Store,
    protected override router: Router,
    protected override route: ActivatedRoute
  ) {
    super();
    console.log('CollectionsService initialized');

    this.load();
    this.initialize();

    effect(() => {
      const subscription = this.totalCount$
        .pipe(filter(count => count !== undefined && count !== null))
        .subscribe(count => this._totalCount.set(count));
      return () => subscription.unsubscribe();
    });
  }

  async initialize() {
    if (this.initialized) return;

    // Set default sort if not present
    if (!this.route.snapshot.queryParams['sortBy']) {
      this.changeSortBy(SolrSortFields.dateMin, SolrSortDirections.desc);
    }

    this.customSearchService.initializeFromRoute();

    // Extract UUID from URL
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

      if (currentRoute.includes(APP_ROUTES_ENUM.COLLECTION)) {
        this.dispatchCollectionsSearch(Object.keys(queryParams).length ? queryParams : null);
      }
    });

    this.initialized = true;
  }

  private dispatchCollectionsSearch(params: any): void {
    console.log('uuid:', this.uuid);

    if (!this.uuid) return;

    const query = params && params['query'] || '';

    if (query && query.length > 0) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    }

    let baseFilters = this.queryParamsService.getFilters(params);
    let customFilters = this.customSearchService.getSolrFqFilters(this.POSSIBLE_FILTERS);

    // Remove duplicate license filters
    if (baseFilters.some(f => f.includes(facetKeysEnum.license)) &&
        customFilters.some(f => f.includes(facetKeysEnum.license))) {
      customFilters = customFilters.filter(f => !f.includes(facetKeysEnum.license));
    }

    // Remove page model filter if no search query
    if (!this.hasSubmittedQuery()) {
      customFilters = customFilters.filter(f => !f.includes(`${facetKeysEnum.model}:page`));
      baseFilters = baseFilters.filter(f => !f.includes(`${facetKeysEnum.model}:page`));
    }

    const { advancedQuery, advancedQueryMainOperator } = {
      advancedQuery: undefined,
      advancedQueryMainOperator: undefined
    };

    let page = 1;
    if (!this._pageReset()) {
      page = Number(params && params['page']) || this._page();
    } else {
      this._pageReset.set(false);
      this.goToPage(page);
    }

    const pageSize = Number(params && params['pageSize']) || this._pageSize();
    const sortBy = params && params['sortBy'] || this._sortBy();
    const sortDirection = params && params['sortDirection'] || this._sortDirection();

    this._searchTerm.set(query);
    this._submittedTerm.set(query);
    this._page.set(page);
    this._pageSize.set(pageSize);
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);

    let filters: string[] = [...baseFilters, ...customFilters];

    console.log('query collections:', query);
    console.log('filters:', filters);

    this.store.dispatch(loadCollectionSearchResults({
      uuid: this.uuid,
      query: query,
      filters: filters,
      advancedQuery,
      advancedQueryMainOperator,
      page: (page - 1) * pageSize,
      pageCount: pageSize,
      sortBy,
      sortDirection
    }));
  }

  // Implementation of abstract methods from BaseFilterService
  getBaseFilters(): Observable<string[]> {
    return of([] as string[]);
  }

  getFacets(): Observable<any> {
    return this.store.select(selectCollectionFacets);
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('[CollectionsService] getting suggestions for:', term);
    return this.solrService.getAutocompleteSuggestions(term);
  }

  onSearch(term: string | null): void {
    const query = (term && term.length > 0) ? `${term}` : '';
    this._submittedTerm.set(query);
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
    this.router.navigate([`/${APP_ROUTES_ENUM.COLLECTION}/${this.uuid}`], {
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
}
