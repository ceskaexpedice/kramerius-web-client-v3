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
      const page = Number(params['page']) || 1;
      const pageSize = Number(params['pageSize']) || 25;

      this._page.set(page);
      this._pageSize.set(pageSize);

      this.store.dispatch(loadSearchResults({
        query,
        filters,
        page,
        pageCount: pageSize
      }));
    });
  }

  ensurePageDefaults(): void {
    const params = this.route.snapshot.queryParams;
    const queryParams: any = {};
    let updateNeeded = false;

    if (!params['page']) {
      queryParams['page'] = this._page();
      updateNeeded = true;
    }

    if (!params['pageSize']) {
      queryParams['pageSize'] = this._pageSize();
      updateNeeded = true;
    }

    if (updateNeeded) {
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams,
        queryParamsHandling: 'merge'
      });
    }
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
      newFilters = currentFilters.filter(f => f !== fullValue);
    } else {
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

  goToPage(page: number) {
    this._page.set(page);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page,
        pageSize: this.pageSize
      },
      queryParamsHandling: 'merge'
    });
  }

  changePageSize(size: number) {
    this._pageSize.set(size);
    this._page.set(1);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        page: 1,
        pageSize: size
      },
      queryParamsHandling: 'merge'
    });
  }

  isSelectedFacetItem(itemName: string): Observable<boolean> {
    return this.activeFilters$.pipe(
      map((filters: string[]) => filters.includes(itemName))
    );
  }

}
