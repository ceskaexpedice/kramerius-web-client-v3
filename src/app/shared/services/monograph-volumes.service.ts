import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Observable, takeUntil } from 'rxjs';
import { BaseFilterService } from './base-filter.service';
import { AdvancedSearchService } from './advanced-search.service';
import * as MonographVolumesActions from '../state/monograph-volumes/monograph-volumes.actions';
import * as MonographVolumesSelectors from '../state/monograph-volumes/monograph-volumes.selectors';
import { getCustomDefinedFacets, customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { SolrQueryBuilder } from '../../core/solr/solr-query-builder';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';

@Injectable()
export class MonographVolumesService extends BaseFilterService {
  uuid: string | null = null;
  inputSearchTerm = '';

  // Observables from store
  volumes$ = this.store.select(MonographVolumesSelectors.selectMonographVolumes);
  parent$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesParent);
  loading$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesLoading);
  error$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesError);
  facets$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesFacets);
  override facetsLoading$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesFacetsLoading);
  // In-monograph search (term over pages + units), mirroring periodical search
  searchResults$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesSearchResults);
  searchTotalCount$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesSearchTotalCount);
  searchLoading$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesSearchLoading);

  POSSIBLE_FILTERS = [customDefinedFacetsEnum.accessibility, facetKeysEnum.license];

  constructor(
    private store: Store,
    override advancedSearchService: AdvancedSearchService
  ) {
    super();
    console.log('MonographVolumesService initialized');

    this.load();
    this.initialize();

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
          if (currentRoute.includes(`/${APP_ROUTES_ENUM.MONOGRAPH_VIEW}`)) {
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

    const extractUuid = (url: string): string | null => {
      const match = url.match(/\/monograph\/([^/?]+)/i);
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
      console.log('MonographVolumes URL changed. UUID:', this.uuid, 'QueryParams:', queryParams);

      if (currentRoute.includes(APP_ROUTES_ENUM.MONOGRAPH_VIEW) && this.uuid) {
        this.dispatchLoadVolumes(Object.keys(queryParams).length ? queryParams : null);
      }
    });

    this.initialized = true;
  }

  private dispatchLoadVolumes(params: any): void {
    if (!this.uuid) return;

    console.log('Dispatching load volumes with params:', params);

    // Accept ?fulltext as a query fallback, same as PeriodicalService — a search
    // term carried over from another page (e.g. saved lists) seeds the input.
    const query = (params && (params['query'] || params['fulltext'])) || '';

    if (query && query.length > 0) {
      this.inputSearchTerm = query;
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
    } else {
      // Query removed from the URL: clear the stale term and any search results
      // so the plain volumes grid shows again.
      this.inputSearchTerm = '';
      this._searchTerm.set('');
      this._submittedTerm.set('');
      this.store.dispatch(MonographVolumesActions.clearMonographVolumesSearch());
    }

    this.customSearchService.initializeFromRoute();

    let baseFilters = this.queryParamsService.getFilters(params);
    let customFilters = this.customSearchService.getSolrFqFilters(this.POSSIBLE_FILTERS);

    // Check for license filter conflicts
    if (baseFilters.some(f => f.includes(facetKeysEnum.license)) &&
        customFilters.some(f => f.includes(facetKeysEnum.license))) {
      customFilters = customFilters.filter(f => !f.includes(facetKeysEnum.license));
    }

    const filters = [...baseFilters, ...customFilters];

    console.log('Base filters:', baseFilters);
    console.log('Custom filters:', customFilters);
    console.log('Combined filters:', filters);
    console.log('Query:', query);

    // Snapshot for the "show more" dialog: same filters + own_parent.pid child
    // scope, mirroring the volume search (SolrService.getChildrenByModel). q stays
    // empty — the scope lives entirely in extraQueryClause.
    const escaped = SolrQueryBuilder.escapeSolrQuery(this.uuid);
    this.captureFacetRequest({
      query: '',
      filters,
      extraQueryClause: `!pid:${escaped} AND own_parent.pid:${escaped}`,
      availabilityFilter: {
        isActive: this.customSearchService.isAvailabilityFilterActive(),
        licenses: this.customSearchService.getUserAvailableLicenses(),
        userLicenses: this.userService.licenses
      }
    });

    // Toolbar sort (?sortBy/?sortDirection). Relevance only makes sense for the
    // term search; the plain volumes listing keeps its natural (rels_ext) order.
    const sortBy = (params && params['sortBy']) as SolrSortFields || SolrSortFields.relevance;
    const sortDirection = (params && params['sortDirection']) as SolrSortDirections || SolrSortDirections.desc;
    this._sortBy.set(sortBy);
    this._sortDirection.set(sortDirection);
    const volumesSort = params && params['sortBy'] && sortBy !== SolrSortFields.relevance
      ? `${sortBy} ${sortDirection}`
      : null;

    // Dispatch action with filters (like SearchService does)
    this.store.dispatch(MonographVolumesActions.loadMonographVolumes({
      uuid: this.uuid,
      filters,
      sort: volumesSort
    }));

    // Active term: run the in-monograph search (pages + units under this root),
    // mirroring the periodical page's search-results mode.
    if (query && query.length > 0) {
      const page = Number(params && params['page']) || 1;
      const pageSize = Number(params && params['pageSize']) || this._pageSize();
      this._page.set(page);
      this._pageSize.set(pageSize);

      this.store.dispatch(MonographVolumesActions.loadMonographVolumesSearchResults({
        uuid: this.uuid,
        query,
        filters,
        page: (page - 1) * pageSize,
        pageCount: pageSize,
        sortBy,
        sortDirection
      }));
    }
  }

  getBaseFilters(): Observable<string[]> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getFilters(params))
    );
  }

  getFacets(): Observable<any> {
    return this.facets$;
  }

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    console.log('MonographVolumesService - toggleFilter:', fullValue);

    // Check if facetKey is in customDefinedFacets
    const [facetKey, facetValue] = fullValue.split(':');
    const isCustom = getCustomDefinedFacets().find(c => c.facetKey === facetKey);

    this.resetPage();

    if (isCustom) {
      console.log('Custom facet detected, using customSearchService');
      this.customSearchService.toggleFilter(fullValue);
      return;
    }

    const params = route.snapshot.queryParams;
    const currentValues = this.queryParamsService.getFiltersByFacet(params, facetKey);

    const isSelected = currentValues.includes(facetValue);
    const newValues = isSelected
      ? currentValues.filter(v => v !== facetValue)
      : [...currentValues, facetValue];

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

  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('[MonographVolumesService] getting suggestions for:', term);
    return this.solrService.getAutocompleteSuggestions(term);
  }

  onSearch(term: string | null): void {
    const query = (term && term.length > 0) ? `${term}` : '';
    this._submittedTerm.set(query);
    this._page.set(1);
    this.search(query);
  }

  onSuggestionSelected(suggestion: string): void {
    this._submittedTerm.set(suggestion);
    this.search(suggestion);
  }

  search(query: string): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        // null removes the param — a user-initiated search (or clear) takes over
        // from a ?fulltext term carried in from another page (e.g. saved lists).
        query: query || null,
        fulltext: null,
        page: 1,
        pageSize: this._pageSize()
      },
      queryParamsHandling: 'merge'
    });
  }
}
