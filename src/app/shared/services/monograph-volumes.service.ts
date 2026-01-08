import { Injectable, inject } from '@angular/core';
import { ActivatedRoute, NavigationEnd } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, Observable, takeUntil } from 'rxjs';
import { BaseFilterService } from './base-filter.service';
import { AdvancedSearchService } from './advanced-search.service';
import * as MonographVolumesActions from '../state/monograph-volumes/monograph-volumes.actions';
import * as MonographVolumesSelectors from '../state/monograph-volumes/monograph-volumes.selectors';
import { customDefinedFacets, customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { SolrService } from '../../core/solr/solr.service';

@Injectable()
export class MonographVolumesService extends BaseFilterService {
  uuid: string | null = null;
  inputSearchTerm = '';

  private solrService = inject(SolrService);

  // Observables from store
  volumes$ = this.store.select(MonographVolumesSelectors.selectMonographVolumes);
  parent$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesParent);
  loading$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesLoading);
  error$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesError);
  facets$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesFacets);
  override facetsLoading$ = this.store.select(MonographVolumesSelectors.selectMonographVolumesFacetsLoading);

  POSSIBLE_FILTERS = [customDefinedFacetsEnum.accessibility, facetKeysEnum.license];

  constructor(
    private store: Store,
    override advancedSearchService: AdvancedSearchService
  ) {
    super();
    console.log('MonographVolumesService initialized');

    this.load();
    this.initialize();
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

    const query = params && params['query'] || '';

    if (query && query.length > 0) {
      this._searchTerm.set(query);
      this._submittedTerm.set(query);
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

    // Dispatch action with filters (like SearchService does)
    this.store.dispatch(MonographVolumesActions.loadMonographVolumes({
      uuid: this.uuid,
      filters
    }));
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
    const isCustom = customDefinedFacets.find(c => c.facetKey === facetKey);

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
        query,
        page: 1,
        pageSize: this._pageSize()
      },
      queryParamsHandling: 'merge'
    });
  }
}
