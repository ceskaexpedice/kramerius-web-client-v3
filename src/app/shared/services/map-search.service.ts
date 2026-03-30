import { inject, Injectable } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { SolrService } from '../../core/solr/solr.service';
import { SearchService } from './search.service';
import { AdvancedSearchService } from './advanced-search.service';
import { CustomSearchService } from './custom-search.service';
import { parseSearchDocument, SearchDocument } from '../../modules/models/search-document';
import { ActivatedRoute } from '@angular/router';
import * as SearchActions from '../../modules/search-results-page/state/search.actions';
import { handleFacetsWithOperators } from '../utils/facet-utils';
import { UserService } from './user.service';
import { MAP_FACET_FIELDS } from '../../modules/search-results-page/const/facet-fields';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

@Injectable({ providedIn: 'root' })
export class MapSearchService {
  private solrService = inject(SolrService);
  private searchService = inject(SearchService);
  private advancedSearchService = inject(AdvancedSearchService);
  private customSearchService = inject(CustomSearchService);
  private route = inject(ActivatedRoute);
  private store = inject(Store);
  private userService = inject(UserService);

  private _results = new BehaviorSubject<SearchDocument[]>([]);
  private _loading = new BehaviorSubject<boolean>(false);
  private _totalCount = new BehaviorSubject<number>(0);
  private _selectedResult = new BehaviorSubject<SearchDocument | null>(null);
  private _page = new BehaviorSubject<number>(0);
  private _currentBounds: MapBounds | null = null;
  private _searchSub: Subscription | null = null;


  pageSize = 100;
  page$ = this._page.asObservable();

  results$ = this._results.asObservable();
  loading$ = this._loading.asObservable();
  totalCount$ = this._totalCount.asObservable();
  selectedResult$ = this._selectedResult.asObservable();

  get page(): number {
    return this._page.value;
  }

  get loading(): boolean {
    return this._loading.value;
  }

  get totalCount(): number {
    return this._totalCount.value;
  }

  searchByBounds(bounds: MapBounds, page = 0): void {
    this._currentBounds = bounds;
    this._page.next(page);
    this._doSearch();
  }

  goToPage(page: number): void {
    this._page.next(page);
    this._doSearch();
  }

  refreshWithCurrentBounds(): void {
    if (this._currentBounds) {
      this._doSearch();
    }
  }

  private _doSearch(): void {
    if (!this._currentBounds) return;
    this._loading.next(true);

    if (this._searchSub) {
      this._searchSub.unsubscribe();
    }

    const bounds = this._currentBounds;
    const filters = [
      ...this.searchService.activeFiltersSnapshot,
      ...this.customSearchService.getSolrFqFilters()
    ];
    const query = this.searchService.submittedTerm;
    const { advancedQuery } = this.advancedSearchService.getAdvancedParams(
      this.route.snapshot.queryParams
    );

    // Default to score (relevance) in map view; respect user's sort choice if set
    const sortBy = this.searchService.sortBy ?? SolrSortFields.relevance;
    const sortDirection = this.searchService.sortDirection ?? SolrSortDirections.desc;

    this._searchSub = this.solrService.searchByBoundingBox(
      bounds.north, bounds.south, bounds.east, bounds.west,
      query, filters, {}, this._page.value, this.pageSize, advancedQuery,
      MAP_FACET_FIELDS, sortBy, sortDirection
    ).pipe(
      map(res => ({
        docs: (res.response?.docs ?? []).map(doc => parseSearchDocument(doc)),
        total: res.response?.numFound ?? 0,
        facets: handleFacetsWithOperators(
          res.facet_counts?.facet_fields ?? {},
          res.facet_counts?.facet_fields ?? {},
          {},
          {},
          this.userService.licenses,
          res.response?.numFound,
          filters,
          res.facet_counts?.facet_queries,
          this.userService.isLoggedIn
        )
      }))
    ).subscribe({
      next: ({ docs, total, facets }) => {
        this._results.next(docs);
        this._totalCount.next(total);
        this._loading.next(false);
        this.store.dispatch(SearchActions.loadFacetsSuccess({ facets }));
      },
      error: () => this._loading.next(false)
    });
  }

  selectResult(doc: SearchDocument | null): void {
    this._selectedResult.next(doc);
  }

  clear(): void {
    if (this._searchSub) {
      this._searchSub.unsubscribe();
      this._searchSub = null;
    }
    this._results.next([]);
    this._totalCount.next(0);
    this._selectedResult.next(null);
    this._currentBounds = null;
    this._page.next(0);
  }
}
