import { computed, effect, inject, Injectable, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, forkJoin, map, Observable, of, takeUntil, combineLatest } from 'rxjs';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { SolrSortDirections, SolrSortFields, SolrOperators } from '../../core/solr/solr-helpers';
import { SolrService } from '../../core/solr/solr.service';
import {
  customDefinedFacetsEnum,
  facetKeysEnum,
  mapFacetsToSearchFields,
} from '../../modules/search-results-page/const/facets';
import { AdvancedSearchService } from './advanced-search.service';
import { BaseFilterService } from './base-filter.service';
import {
  selectCollectionSearchResults,
  selectCollectionSearchResultsTotalCount,
  selectCollectionSearchResultsLoading,
  selectCollectionFacetsLoading,
  selectCollectionSearchResultsError,
  selectCollectionFacets,
  selectCollectionDetail,
  selectCollectionDetailLoading,
  selectCollectionDetailError
} from '../state/collections/collections.selectors';
import { loadCollectionSearchResults, loadCollectionDetail } from '../state/collections/collections.actions';
import { BreadcrumbsService } from './breadcrumbs.service';
import { Breadcrumb } from '../models/breadcrumb.model';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { fromSolrToMetadata, Metadata } from '../models/metadata.model';
import { TranslateService } from '@ngx-translate/core';
import { selectActiveFilters } from '../../modules/search-results-page/state/search.selectors';
import { SearchService } from './search.service';
import { EnvironmentService } from './environment.service';

@Injectable({
  providedIn: 'root'
})
export class CollectionsService extends BaseFilterService {
  uuid: string | null = null;

  inputSearchTerm = '';

  totalCount$ = this.store.select(selectCollectionSearchResultsTotalCount);
  loading$ = this.store.select(selectCollectionSearchResultsLoading);
  override facetsLoading$ = this.store.select(selectCollectionFacetsLoading);
  error$ = this.store.select(selectCollectionSearchResultsError);

  detail$ = this.store.select(selectCollectionDetail);
  detailLoading$ = this.store.select(selectCollectionDetailLoading);
  detailError$ = this.store.select(selectCollectionDetailError);

  activeFilters$: Observable<string[]> = this.store.select(selectActiveFilters);
  POSSIBLE_FILTERS = [
    customDefinedFacetsEnum.accessibility,
    facetKeysEnum.license,
    facetKeysEnum.model,
    'dateFrom',
    'dateTo'
  ];

  private solrService = inject(SolrService);
  override advancedSearchService = inject(AdvancedSearchService);
  private breadcrumbsService = inject(BreadcrumbsService);
  private translationService = inject(TranslateService);
  private env = inject(EnvironmentService);

  // Convert detail$ to signal for reactive breadcrumb updates
  private detailSignal = toSignal(this.detail$);

  // Collection structure tree for breadcrumb generation
  private collectionStructureTree: Metadata[] = [];
  private collectionPaths: Metadata[][] = [];

  constructor(
    private store: Store,
    protected override router: Router,
    protected override route: ActivatedRoute,
    protected searchService: SearchService
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

    // Watch for collection detail changes and update breadcrumbs
    effect(() => {
      const detail = this.detailSignal();
      if (detail && detail.model === 'collection') {
        this.updateBreadcrumbs(detail);
      }
    });
  }

  private structureOrder = signal<string[]>([]);

  private loadStructure(uuid: string) {
    const url = `${this.env.getApiUrl('items')}/${uuid}/info/structure`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        const children = data.children?.foster || [];
        const order = children.map((c: any) => c.pid);
        this.structureOrder.set(order);
      })
      .catch(err => {
        console.error('Error loading structure:', err);
        this.structureOrder.set([]);
      });
  }

  searchResults$ = combineLatest([
    this.store.select(selectCollectionSearchResults),
    toObservable(this.structureOrder),
    toObservable(this._sortBy)
  ]).pipe(
    map(([results, order, sortBy]) => {
      // Only apply structure sorting when sorting by relevance
      if (!order.length || !results || sortBy !== SolrSortFields.relevance) {
        return results;
      }

      return [...results].sort((a, b) => {
        const indexA = order.indexOf(a.pid);
        const indexB = order.indexOf(b.pid);

        if (indexA === -1 && indexB === -1) return 0;
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;

        return indexA - indexB;
      });
    })
  );

  async initialize() {
    if (this.initialized) return;

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

        // Set default sort if not present - navigate once with defaults
        if (!this.route.snapshot.queryParams['sortBy']) {
          this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              sortBy: SolrSortFields.relevance,
              sortDirection: SolrSortDirections.desc
            },
            queryParamsHandling: 'merge',
            replaceUrl: true
          });
          return;
        }

        this.customSearchService.initializeFromRoute();

        // Load collection detail
        if (this.uuid) {
          const uuid = this.uuid;
          this.store.dispatch(loadCollectionDetail({ uuid }));
          this.loadStructure(uuid);
        } else {
          this.structureOrder.set([]);
        }

        // Load collection search results if there are query params
        this.dispatchCollectionsSearch(Object.keys(queryParams).length ? queryParams : null);
      }
    });

    this.initialized = true;
  }

  private dispatchCollectionsSearch(params: any): void {
    if (!this.uuid) return;
    const uuid = this.uuid;

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

    let advancedQuery: string | undefined = '';
    let advancedQueryMainOperator: SolrOperators | undefined = undefined;

    // Handle year range filter as a separate advanced query
    const yearFrom = params && params['yearFrom'];
    const yearTo = params && params['yearTo'];

    if (yearFrom !== undefined || yearTo !== undefined) {
      const from = yearFrom ? parseInt(yearFrom, 10) : 0;
      const to = yearTo ? parseInt(yearTo, 10) : new Date().getFullYear();
      const yearRangeQuery = `(date_range_start.year:[${from} TO ${to}] OR date_range_end.year:[${from} TO ${to}])`;

      advancedQuery = yearRangeQuery;
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
    console.log('advancedQuery:', advancedQuery);

    filters = mapFacetsToSearchFields(filters);

    const includePeriodicalItem = this.filtersContainDate() || this.hasFulltextFilter();
    const includePage = this.hasSubmittedQuery() || this.hasFulltextFilter();

    this.store.dispatch(loadCollectionSearchResults({
      uuid,
      query,
      filters,
      advancedQuery,
      advancedQueryMainOperator,
      page: (page - 1) * pageSize,
      pageCount: pageSize,
      sortBy: sortBy as SolrSortFields,
      sortDirection: sortDirection as SolrSortDirections,
      includePeriodicalItem,
      includePage
    }));
  }

  // Implementation of abstract methods from BaseFilterService
  getBaseFilters(): Observable<string[]> {
    return this.activeFilters$;
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

  /**
   * Recursively builds the collection structure tree by fetching parent collections
   */
  private buildCollectionStructureTree(uuid: string): Observable<void> {
    return new Observable<void>((subscriber) => {
      this.solrService.getDetailItem(uuid).subscribe({
        next: (solrDoc) => {
          if (!solrDoc) {
            subscriber.complete();
            return;
          }

          const currentLang = this.translationService.getCurrentLang();
          const metadata = fromSolrToMetadata(solrDoc, currentLang);
          this.collectionStructureTree.unshift(metadata);

          // If this collection has parent collections, fetch them recursively
          if (metadata.inCollections && metadata.inCollections.length > 0) {
            const observables = metadata.inCollections.map((col) =>
              this.buildCollectionStructureTree(col.uuid)
            );

            forkJoin(observables).subscribe({
              next: () => {
                subscriber.next();
                subscriber.complete();
              },
              error: (error) => {
                console.error('Error building collection tree:', error);
                subscriber.error(error);
              }
            });
          } else {
            // No parent collections - this is a root collection
            subscriber.next();
            subscriber.complete();
          }
        },
        error: (error) => {
          console.error('Error fetching collection:', uuid, error);
          subscriber.error(error);
        }
      });
    });
  }

  /**
   * Recursively finds all paths from the current collection to root collections
   */
  private findPaths(col: Metadata | undefined, path: Metadata[] = []): void {
    if (!col) {
      return;
    }

    const newPath = [col, ...path];

    // If this collection has parent collections, continue recursively
    if (col.inCollections && col.inCollections.length > 0) {
      for (const parentRef of col.inCollections) {
        const parentCol = this.collectionStructureTree.find(x => x.uuid === parentRef.uuid);
        this.findPaths(parentCol, newPath);
      }
    } else {
      // No parent collections - this is a root collection, save the path
      this.collectionPaths.push(newPath);
    }
  }

  /**
   * Gets the collection title in the current language
   */
  private getLocalizedTitle(metadata: Metadata): string {
    if (!metadata || !metadata.collectionTitles) return metadata?.mainTitle || '';

    const currentLang = this.translationService.getCurrentLang();

    // Try current language
    if (metadata.collectionTitles[currentLang]) {
      return metadata.collectionTitles[currentLang];
    }

    // Fall back to English
    if (metadata.collectionTitles['en']) {
      return metadata.collectionTitles['en'];
    }

    // Fall back to any available language
    const availableLanguages = Object.keys(metadata.collectionTitles);
    if (availableLanguages.length > 0) {
      return metadata.collectionTitles[availableLanguages[0]];
    }

    // Last resort: use mainTitle
    return metadata.mainTitle || '';
  }

  /**
   * Update breadcrumbs with collection hierarchy
   */
  private updateBreadcrumbs(metadata: Metadata): void {
    // Reset collections tree and paths
    this.collectionStructureTree = [];
    this.collectionPaths = [];

    const searchUrl = this.searchService.getBackupSearchUrl() || APP_ROUTES_ENUM.SEARCH_RESULTS;

    // Build the collection hierarchy tree
    this.buildCollectionStructureTree(metadata.uuid).subscribe({
      next: () => {
        // Find all paths from current collection to root
        const startingCol = this.collectionStructureTree.find(x => x.uuid === metadata.uuid);
        this.findPaths(startingCol);

        // If no paths found, create a simple path with just the current collection
        if (this.collectionPaths.length === 0) {
          this.collectionPaths = [[metadata]];
        }

        // Build breadcrumb arrays for all paths
        const allBreadcrumbPaths: Breadcrumb[][] = [];

        for (const collectionPath of this.collectionPaths) {
          const breadcrumbs: Breadcrumb[] = [
            {
              label: 'search',
              translationKey: 'search-breadcrumb--label',
              url: `${searchUrl}`,
              clickable: true
            }
          ];

          // Add collection breadcrumbs (root to current - path is already in correct order)
          for (let i = 0; i < collectionPath.length; i++) {
            const col = collectionPath[i];
            const title = this.getLocalizedTitle(col);
            breadcrumbs.push({
              label: title,
              url: `/${APP_ROUTES_ENUM.COLLECTION}/${col.uuid}`,
              clickable: i !== collectionPath.length - 1 // Last item (current collection) is not clickable
            });
          }

          allBreadcrumbPaths.push(breadcrumbs);
        }

        // If only one path, use setBreadcrumbs, otherwise use setMultiplePaths
        // if (allBreadcrumbPaths.length === 1) {
        this.breadcrumbsService.setBreadcrumbs(allBreadcrumbPaths[0], true);
        // } else {
        //   this.breadcrumbsService.setMultiplePaths(allBreadcrumbPaths, true);
        // }
      },
      error: (error) => {
        console.error('Error building breadcrumbs:', error);

        // Fallback to simple breadcrumb if hierarchy building fails
        const title = this.getLocalizedTitle(metadata);
        const breadcrumbs: Breadcrumb[] = [
          {
            label: 'search',
            translationKey: 'search-breadcrumb--label',
            url: `${searchUrl}`,
            clickable: true
          },
          {
            label: title,
            url: `/${APP_ROUTES_ENUM.COLLECTION}/${metadata.uuid}`,
            clickable: false
          }
        ];

        this.breadcrumbsService.setBreadcrumbs(breadcrumbs, true);
      }
    });
  }
}
