import {Injectable, signal, effect} from '@angular/core';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {ActivatedRoute, Router} from '@angular/router';
import {Observable, map, filter} from 'rxjs';
import {Store} from '@ngrx/store';
import {
  selectActiveFilters,
  selectSearchResults,
  selectSearchResultsTotalCount,
} from '../../state/search/search.selectors';
import {SearchDocument} from '../../modules/models/search-document';
import {loadSearchResults} from '../../state/search/search.actions';
import {FacetItem} from '../../modules/models/facet-item';

@Injectable({
  providedIn: 'root'
})
export class SearchService {
  private _page = signal(1);
  private _pageSize = signal(25);
  private _totalCount = signal(0);

  results$: Observable<SearchDocument[]>;
  totalCount$: Observable<number>;
  activeFilters$: Observable<string[]>;

  get page() {
    return this._page();
  }

  get pageSize() {
    return this._pageSize();
  }

  get totalCount() {
    return this._totalCount();
  }

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private store: Store,
  ) {
    this.results$ = this.store.select(selectSearchResults);
    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);
    this.activeFilters$ = this.store.select(selectActiveFilters);

    effect(() => {
      const subscription = this.totalCount$
        .pipe(
          filter((count) => count !== undefined && count !== null) // Ensure valid values
        )
        .subscribe((count) => {
          this._totalCount.set(count);
        });

      return () => subscription.unsubscribe();
    });

    this.route.queryParams.subscribe((params: any) => {
      const query = params['query'] || '*:*';
      const filters = Array.isArray(params['fq']) ? params['fq'] : [params['fq']].filter(Boolean);
      this.store.dispatch(loadSearchResults({
        query,
        filters,
        page: this.page,
        pageCount: this.pageSize
      }));
    });
  }

  search(query: string): void {
    this.router.navigate([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`], { queryParams: { query } });
  }

  updateFilters(route: ActivatedRoute, facetKey: string, selectedValues: string[], useOrOperator: boolean = true): void {
    const fq = route.snapshot.queryParams['fq'];
    const otherFilters = (Array.isArray(fq) ? fq : fq ? [fq] : []).filter(
      f => !f.startsWith(facetKey + ':')
    );

    let facetFilters: string[] = [];

    if (selectedValues.length > 0) {

      facetFilters = selectedValues.map(value => `${facetKey}:${value}`);

    }

    const updated = [
      ...otherFilters,
      ...facetFilters
    ];

    const queryParams: any = { fq: updated };

    // if useOrOperator is true, add to url param facetKey_operator=AND
    if (useOrOperator) {
      queryParams[`${facetKey}_operator`] = 'AND';
    } else {
      // delete the operator param if it exists
      queryParams[`${facetKey}_operator`] = 'OR';
    }

    this.router.navigate([], {
      relativeTo: route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    const facetKey = fullValue.split(':')[0];
    const fq = route.snapshot.queryParams['fq'];
    const currentFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    const currentFacetFilters = currentFilters.filter(f => f.startsWith(facetKey + ':'));

    let newFilters: string[];

    if (currentFacetFilters.includes(fullValue)) {
      // Odstránime filter
      newFilters = currentFilters.filter(f => f !== fullValue);
    } else {
      // Pridáme filter
      newFilters = [...currentFilters, fullValue];
    }

    this.router.navigate([], {
      relativeTo: route,
      queryParams: { fq: newFilters },
      queryParamsHandling: 'merge'
    });
  }

  removeFilter(filter: string) {
    const currentParams = this.route.snapshot.queryParams;
    const fq = currentParams['fq'];
    const filters = Array.isArray(fq) ? fq : fq ? [fq] : [];

    const updatedFilters = filters.filter(f => f !== filter);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { ...currentParams, fq: updatedFilters },
      queryParamsHandling: 'merge'
    });
  }

  clearAllFilters() {
    const currentParams = this.route.snapshot.queryParams;
    const { fq, ...otherParams } = currentParams;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: otherParams
    });
  }

  getFiltersByFacet(facet: string): Observable<string[]> {
    // here are all filters
    const filters = this.activeFilters$;
    // here are only filters for the facet
    return filters.pipe(
      map((filters: any) => filters.filter((filter: any) => filter.startsWith(facet + ':')))
    );
  }

  isSelectedFilter() {

  }

  goToPage(page: number) {
    console.log('page', page);
    this._page.set(page);
    this.loadSearchResults();
  }

  changePageSize(size: number) {
    this._pageSize.set(size);
    this._page.set(1);
    this.loadSearchResults();
  }

  private loadSearchResults() {
    const query = this.route.snapshot.queryParams['query'] || '*:*';
    const filters = this.route.snapshot.queryParams['fq'] || [];
    const page = (this.page - 1) * this.pageSize;
    console.log('page', page);

    this.store.dispatch(loadSearchResults({
      query,
      filters,
      page,
      pageCount: this.pageSize
    }));
  }

  isSelectedFacetItem(itemName: string): Observable<boolean> {
    return this.activeFilters$.pipe(
      map((filters: string[]) => filters.includes(itemName))
    );
  }

}
