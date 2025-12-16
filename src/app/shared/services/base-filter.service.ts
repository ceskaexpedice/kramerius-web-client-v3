import { computed, inject, Injectable, OnDestroy, Signal, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { combineLatest, map, Observable, of, Subject, takeUntil } from 'rxjs';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { QueryParamsService } from '../../core/services/QueryParamsManager';
import { CustomSearchService } from './custom-search.service';
import { UserService } from './user.service';
import { FilterService } from './filter.service';
import { AdvancedSearchService } from './advanced-search.service';

@Injectable()
export abstract class BaseFilterService implements FilterService, OnDestroy {
  // Common properties
  protected _searchTerm = signal('');
  protected _submittedTerm = signal('');
  protected _page = signal(1);
  protected _pageSize = signal(60);
  protected _totalCount = signal(0);
  protected _sortBy = signal(SolrSortFields.createdAt);
  protected _sortDirection = signal(SolrSortDirections.desc);
  protected _pageReset = signal(false);
  protected initialized = false;
  protected destroy$ = new Subject<void>();

  // Common dependencies
  protected route = inject(ActivatedRoute);
  protected router = inject(Router);
  protected queryParamsService = inject(QueryParamsService);
  protected customSearchService = inject(CustomSearchService);
  protected advancedSearchService = inject(AdvancedSearchService);
  protected userService = inject(UserService);

  // Common getters
  get searchTerm() { return this._searchTerm; }
  get submittedTerm() { return this._submittedTerm(); }
  get page() { return this._page(); }
  get pageSize() { return this._pageSize(); }
  get totalCount() { return this._totalCount(); }
  get sortBy() { return this._sortBy(); }
  get sortDirection() { return this._sortDirection(); }

  // Common computed properties
  get hasSubmittedQuery() {
    return computed(() => this._submittedTerm().trim().length > 0);
  }

  get hasFulltextFilter(): Signal<boolean> {
    return computed(() => {
      return this.advancedSearchService.hasFulltextFilter();
    });
  }

  // Common computed property that can be overridden by subclasses
  get filtersContainDate() {
    return computed(() => false); // Base implementation, can be overridden
  }

  // Common selectedTags implementation
  get selectedTags(): Observable<string[]> {
    return combineLatest([
      this.getBaseFilters(), // Abstract method
      of(this.submittedTerm),
      this.route.queryParams
    ]).pipe(
      map(([filters, term, params]) => {
        let allFilters: string[] = [...filters];

        // Add search term if present
        if (term && term.trim().length > 0) {
          allFilters.push(`search:${term}`);
        }

        // Add custom search filters (including date/year range filters)
        const customFilters = this.getCustomFiltersFromParams(params);
        allFilters.push(...customFilters);

        return allFilters;
      })
    );
  }

  // Common method: Get custom filters from params (identical in both services)
  protected getCustomFiltersFromParams(params: any): string[] {
    const filters: string[] = [];

    // Get custom search filters
    const customRaw = params['customSearch'];
    const customFilters = customRaw ? customRaw.split(',') : [];
    filters.push(...customFilters);

    // Add year range as single combined filter
    const yearFrom = params['yearFrom'];
    const yearTo = params['yearTo'];
    if (yearFrom !== undefined || yearTo !== undefined) {
      const fromYear = yearFrom || '0';
      const toYear = yearTo || new Date().getFullYear().toString();
      filters.push(`yearRange:${fromYear} - ${toYear}`);
    }

    // Add date range as single combined filter
    const dateFrom = params['dateFrom'];
    const dateTo = params['dateTo'];
    if (dateFrom !== undefined || dateTo !== undefined) {
      if (dateFrom && dateTo) {
        filters.push(`dateRange:${dateFrom} - ${dateTo}`);
      } else if (dateFrom) {
        filters.push(`dateRange:${dateFrom} - *`);
      } else if (dateTo) {
        filters.push(`dateRange:* - ${dateTo}`);
      }
    }

    // Note: dateOffset is not displayed as a separate tag since it's part of date range logic

    return filters;
  }

  // Common method: Remove filter (identical in both services)
  removeFilter(filter: string) {
    if (filter.startsWith('search:')) {
      this.queryParamsService.removeSearchTerm(this.route);
      this._searchTerm.set('');
      this._submittedTerm.set('');
    } else if (this.isCustomFilter(filter)) {
      // Handle custom filters including combined date/year ranges
      const [facetKey] = filter.split(':');

      if (facetKey === 'yearRange') {
        // Remove year range parameters
        this.customSearchService.removeYearRange();
      } else if (facetKey === 'dateRange') {
        // Remove date range parameters
        this.customSearchService.removeDateRange();
      } else {
        // Handle other custom filters
        this.customSearchService.removeFilter(filter);
      }
    } else {
      this.queryParamsService.removeFilter(this.route, filter);
    }
  }

  // Common method: Check if filter is custom (identical in both services)
  protected isCustomFilter(filter: string): boolean {
    const [facetKey] = filter.split(':');
    const customFilterKeys = ['dateFrom', 'dateTo', 'dateOffset', 'yearFrom', 'yearTo', 'yearRange', 'dateRange'];
    return customFilterKeys.includes(facetKey) || this.customSearchService.getAppliedFilters().includes(filter);
  }

  // Common method: Clear all filters (similar pattern in both services)
  clearAllFilters() {
    this._submittedTerm.set('');
    this._searchTerm.set('');
    this._pageReset.set(true);

    const currentParams = this.route.snapshot.queryParams;
    const newParams = { ...currentParams };

    // 1. Clear Search Term
    newParams['query'] = null;

    // 2. Clear Standard Filters
    delete newParams['fq'];

    // 3. Clear Operators
    Object.keys(newParams).forEach(key => {
      if (key.endsWith('_operator')) {
        delete newParams[key];
      }
    });

    // 4. Clear Custom Search & Date/Year Ranges
    newParams['customSearch'] = null;
    const customKeys = ['dateFrom', 'dateTo', 'dateOffset', 'yearFrom', 'yearTo'];
    customKeys.forEach(key => newParams[key] = null);

    // 5. Reset Page
    newParams['page'] = 1;

    // Remove null/undefined to clean up URL
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === null || newParams[key] === undefined) {
        delete newParams[key];
      }
    });

    // Single Consolidated Navigation
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: newParams
    });

    // Update local state for custom search service to reflect changes immediately
    // ensuring it doesn't try to trigger its own updates if called
    // (Note: initializeFromRoute in SearchService should handle the sync)
  }

  // Common method: Reset page
  resetPage(): void {
    this._pageReset.set(true);
  }

  // Common method: Remove field filters
  removeFieldFilters(field: string) {
    this.queryParamsService.removeFieldFilters(this.route, field);
  }

  // Common method: Reset operator
  resetOperator(field: string) {
    this.queryParamsService.resetOperator(this.route, field);
  }

  // Common method for loading (required by FilterService interface)
  async load(): Promise<void> {
    await this.userService.loadLicenses();
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

  // Common cleanup
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Abstract methods that each service must implement
  abstract getBaseFilters(): Observable<string[]>;
  abstract getFacets(): Observable<any>;
  abstract getFiltersWithOperators(): Observable<Record<string, string>>;
  abstract toggleFilter(route: ActivatedRoute, fullValue: string): void;
}
