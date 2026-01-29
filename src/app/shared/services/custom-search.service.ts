import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from './user.service';
import { QueryParamsService } from '../../core/services/QueryParamsManager';
import {filter, take} from 'rxjs';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetAccessibilityTypes,
} from '../../modules/search-results-page/const/facets';
import { PUBLIC_LICENSES, ONSITE_LICENSES, AFTER_LOGIN_LICENSES } from '../../core/solr/solr-misc';

@Injectable({ providedIn: 'root' })
export class CustomSearchService {
  private _appliedFilters = signal<string[]>([]);

  filters = computed(() => this._appliedFilters());

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private queryParamsService = inject(QueryParamsService);

  // Date/Year range filter keys
  private readonly DATE_FROM_KEY = 'dateFrom';
  private readonly DATE_TO_KEY = 'dateTo';
  private readonly DATE_OFFSET_KEY = 'dateOffset';
  private readonly YEAR_FROM_KEY = 'yearFrom';
  private readonly YEAR_TO_KEY = 'yearTo';

  initializeFromRoute(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const raw = params['customSearch'];
      let list: string[] = raw ? raw.split(',') as string[] : [];

      // Also initialize from date/year range parameters
      list = this.addDateYearRangeFromParams(params, list);

      this._appliedFilters.set(list);
    });
  }

  private addDateYearRangeFromParams(params: any, currentFilters: string[]): string[] {
    // Remove any date/year range filters from currentFilters (they shouldn't be in customSearch)
    // Date/year ranges are stored as individual query parameters only
    let updated = [...currentFilters].filter(f =>
      !f.startsWith(`${this.DATE_FROM_KEY}:`) &&
      !f.startsWith(`${this.DATE_TO_KEY}:`) &&
      !f.startsWith(`${this.DATE_OFFSET_KEY}:`) &&
      !f.startsWith(`${this.YEAR_FROM_KEY}:`) &&
      !f.startsWith(`${this.YEAR_TO_KEY}:`)
    );

    return updated;
  }

  isActive(): boolean {
    return this._appliedFilters().length > 0;
  }

  getAppliedFilters(): string[] {
    return this._appliedFilters();
  }

  getSolrFqFilters(possibleFilters: string[] | null = null): string[] {
    const result: string[] = [];

    let filters = this._appliedFilters();

    // Filter out date/year range filters as they are handled separately in SearchService
    const dateYearFilterKeys = [this.DATE_FROM_KEY, this.DATE_TO_KEY, this.DATE_OFFSET_KEY, this.YEAR_FROM_KEY, this.YEAR_TO_KEY];
    filters = filters.filter(f => !dateYearFilterKeys.some(key => f.startsWith(`${key}:`)));

    // If possibleFilters is provided, filter the applied filters - filters should only include those that are in possibleFilters
    if (possibleFilters) {
      // filter applied filters by checking if they are included in possibleFilters
      filters = filters.filter(filter => possibleFilters.some(pf => filter.includes(pf)));
    }

    for (const key of filters) {
      const facetKey = key.split(':')[0];
      const value = key.split(':')[1];

      const filterItem = customDefinedFacets.find(facet => facet.facetKey === facetKey);

      switch (facetKey) {
        case customDefinedFacetsEnum.accessibility:
          // Accessibility filter is handled separately via getAvailabilityFq()
          // Do not add license filters here
          break;
        case customDefinedFacetsEnum.whereToSearchModel:
          const selectedItem = filterItem?.data.find(item => item.name === value);
          if (filterItem && selectedItem && selectedItem.fq && selectedItem.fq.length > 0) {
            // If fq is an array, iterate through it and add each fq to the result
            // Otherwise, just add the single fq
            if (Array.isArray(selectedItem.fq)) {
              selectedItem.fq.forEach((fq: string) => {
                if (fq) {
                  result.push(`${filterItem.solrFacetKey}:${fq}`);
                }
              });
            } else if (selectedItem.fq) {
              result.push(`${filterItem.solrFacetKey}:${selectedItem.fq}`);
            }
          }
          break;
        default:
          // Only add if we found a valid filterItem
          if (filterItem?.solrFacetKey) {
            result.push(`${filterItem.solrFacetKey}:${value}`);
          }
          break;
      }
    }

    return result;
  }

  /**
   * Returns true if any accessibility filter is active (available, public, onsite, or afterLogin)
   */
  isAvailabilityFilterActive(): boolean {
    return this._appliedFilters().some(f =>
      f === `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.available}` ||
      f === `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.public}` ||
      f === `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.onsite}` ||
      f === `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.afterLogin}`
    );
  }

  /**
   * Returns true if the "Public" accessibility filter is active
   */
  isPublicFilterActive(): boolean {
    return this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.public}`
    );
  }

  /**
   * Returns true if the "Onsite" accessibility filter is active
   */
  isOnsiteFilterActive(): boolean {
    return this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.onsite}`
    );
  }

  /**
   * Returns true if the "After Login" accessibility filter is active
   */
  isAfterLoginFilterActive(): boolean {
    return this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.afterLogin}`
    );
  }

  /**
   * Returns the licenses for the currently active accessibility filter
   * - "available": user's licenses
   * - "public": PUBLIC_LICENSES
   * - "onsite": ONSITE_LICENSES
   * - "afterLogin": AFTER_LOGIN_LICENSES
   * - "all": empty array (no filter)
   */
  getUserAvailableLicenses(): string[] {
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.available}`
    )) {
      return this.userService.licenses;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.public}`
    )) {
      return PUBLIC_LICENSES;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.onsite}`
    )) {
      return ONSITE_LICENSES;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.afterLogin}`
    )) {
      return AFTER_LOGIN_LICENSES;
    }
    return this.userService.licenses;
  }

  /**
   * Returns the active accessibility filter type, or null if "all" is selected
   */
  getActiveAccessibilityFilterType(): FacetAccessibilityTypes | null {
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.available}`
    )) {
      return FacetAccessibilityTypes.available;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.public}`
    )) {
      return FacetAccessibilityTypes.public;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.onsite}`
    )) {
      return FacetAccessibilityTypes.onsite;
    }
    if (this._appliedFilters().includes(
      `${customDefinedFacetsEnum.accessibility}:${FacetAccessibilityTypes.afterLogin}`
    )) {
      return FacetAccessibilityTypes.afterLogin;
    }
    return null;
  }

  toggleFilter(key: string): void {
    const current = this._appliedFilters();
    const isActive = current.includes(key);
    const updated = isActive ? current.filter(k => k !== key) : [...current, key];

    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  getCustomSearchQuery(key: string): string {
    return `customSearch=${key}`;
  }

  removeFilter(key: string): void {
    const updated = this._appliedFilters().filter(k => k !== key);
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  addFilter(key: string): void {
    const current = this._appliedFilters();
    if (current.includes(key)) return; // Filter already applied

    const updated = [...current, key];
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  removeFilterByValue(facetKey: string, value: string): void {
    const filterKey = `${facetKey}:${value}`;
    const updated = this._appliedFilters().filter(k => k !== filterKey);
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  removeAllFiltersByFacetKey(facetKey: string): void {
    const updated = this._appliedFilters().filter(k => !k.startsWith(facetKey + ':'));
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  getSelectedFilterValue(facetKey: string): string | null {
    const filterItem = customDefinedFacets.find(facet => facet.facetKey === facetKey);
    if (!filterItem) return null;

    const selectedFilter = this._appliedFilters().find(k => k.startsWith(facetKey + ':'));
    if (!selectedFilter) return null;

    const value = selectedFilter.split(':')[1];

    return value;
  }

  clear(): void {
    this._appliedFilters.set([]);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: null,
      // Also clear date/year range parameters
      [this.DATE_FROM_KEY]: null,
      [this.DATE_TO_KEY]: null,
      [this.DATE_OFFSET_KEY]: null,
      [this.YEAR_FROM_KEY]: null,
      [this.YEAR_TO_KEY]: null,
    });
  }

  apply(): void {
    this._appliedFilters.set(this._appliedFilters());
  }

  getCustomSearchPreview() {
    return this._appliedFilters().map(k => ({
      label: this.getLabelForKey(k),
      key: k
    }));
  }

  private getLabelForKey(key: string): string {
    const [facetKey, value] = key.split(':');
    switch (facetKey) {
      case this.DATE_FROM_KEY:
        return `Date From: ${value}`;
      case this.DATE_TO_KEY:
        return `Date To: ${value}`;
      case this.DATE_OFFSET_KEY:
        return `Date Offset: ${value} days`;
      case this.YEAR_FROM_KEY:
        return `Year From: ${value}`;
      case this.YEAR_TO_KEY:
        return `Year To: ${value}`;
      default:
        return key;
    }
  }

  // Date range methods
  setDateRange(dateFrom: Date | null, dateTo: Date | null, offset: number): void {
    // Remove date/year range filters from the applied filters (they shouldn't be in customSearch)
    const current = this._appliedFilters();
    const updated = current.filter(f =>
      !f.startsWith(`${this.DATE_FROM_KEY}:`) &&
      !f.startsWith(`${this.DATE_TO_KEY}:`) &&
      !f.startsWith(`${this.DATE_OFFSET_KEY}:`) &&
      !f.startsWith(`${this.YEAR_FROM_KEY}:`) &&
      !f.startsWith(`${this.YEAR_TO_KEY}:`)
    );

    const queryParams: any = {};

    // Set individual query parameters (not part of customSearch)
    if (dateFrom) {
      const dateFromParam = dateFrom.toISOString().split('T')[0];
      queryParams[this.DATE_FROM_KEY] = dateFromParam;
    } else {
      queryParams[this.DATE_FROM_KEY] = null;
    }

    if (dateTo) {
      const dateToParam = dateTo.toISOString().split('T')[0];
      queryParams[this.DATE_TO_KEY] = dateToParam;
    } else {
      queryParams[this.DATE_TO_KEY] = null;
    }

    if (offset !== undefined && offset !== 0) {
      queryParams[this.DATE_OFFSET_KEY] = offset;
    } else {
      queryParams[this.DATE_OFFSET_KEY] = null;
    }

    // Update customSearch with only non-date/year filters
    queryParams.customSearch = updated.length > 0 ? updated.join(',') : null;
    queryParams.page = 1; // Reset to first page

    this._appliedFilters.set(updated);
    this.queryParamsService.appendToQueryParams(this.route, queryParams);
  }

  // Year range methods
  setYearRange(yearFrom: number, yearTo: number): void {
    // Remove date/year range filters from the applied filters (they shouldn't be in customSearch)
    const current = this._appliedFilters();
    const updated = current.filter(f =>
      !f.startsWith(`${this.DATE_FROM_KEY}:`) &&
      !f.startsWith(`${this.DATE_TO_KEY}:`) &&
      !f.startsWith(`${this.DATE_OFFSET_KEY}:`) &&
      !f.startsWith(`${this.YEAR_FROM_KEY}:`) &&
      !f.startsWith(`${this.YEAR_TO_KEY}:`)
    );

    const queryParams: any = {};
    const currentYear = new Date().getFullYear();

    // Set individual query parameters (not part of customSearch)
    if (yearFrom !== undefined && yearFrom !== 0) {
      queryParams[this.YEAR_FROM_KEY] = yearFrom;
    } else {
      queryParams[this.YEAR_FROM_KEY] = null;
    }

    if (yearTo !== undefined && yearTo !== currentYear) {
      queryParams[this.YEAR_TO_KEY] = yearTo;
    } else {
      queryParams[this.YEAR_TO_KEY] = null;
    }

    // Update customSearch with only non-date/year filters
    queryParams.customSearch = updated.length > 0 ? updated.join(',') : null;
    queryParams.page = 1; // Reset to first page

    this._appliedFilters.set(updated);
    this.queryParamsService.appendToQueryParams(this.route, queryParams);
  }

  // Get current date/year range values from route parameters
  getDateFrom(): Date | null {
    const params = this.route.snapshot.queryParams;
    return params[this.DATE_FROM_KEY] ? new Date(params[this.DATE_FROM_KEY]) : null;
  }

  getDateTo(): Date | null {
    const params = this.route.snapshot.queryParams;
    return params[this.DATE_TO_KEY] ? new Date(params[this.DATE_TO_KEY]) : null;
  }

  getDateOffset(): number {
    const params = this.route.snapshot.queryParams;
    return params[this.DATE_OFFSET_KEY] ? parseInt(params[this.DATE_OFFSET_KEY], 10) : 0;
  }

  getYearFrom(): number | null {
    const params = this.route.snapshot.queryParams;
    return params[this.YEAR_FROM_KEY] ? parseInt(params[this.YEAR_FROM_KEY], 10) : null;
  }

  getYearTo(): number | null {
    const params = this.route.snapshot.queryParams;
    return params[this.YEAR_TO_KEY] ? parseInt(params[this.YEAR_TO_KEY], 10) : null;
  }

  // Remove specific date/year range filters
  removeDateRange(): void {
    // Date ranges are individual parameters, no need to modify applied filters
    this.queryParamsService.appendToQueryParams(this.route, {
      [this.DATE_FROM_KEY]: null,
      [this.DATE_TO_KEY]: null,
      [this.DATE_OFFSET_KEY]: null,
    });
  }

  removeYearRange(): void {
    // Year ranges are individual parameters, no need to modify applied filters
    this.queryParamsService.appendToQueryParams(this.route, {
      [this.YEAR_FROM_KEY]: null,
      [this.YEAR_TO_KEY]: null,
    });
  }

  get filtersContainDateOrYearRange(): boolean {
    const dateYearFilterKeys = [this.DATE_FROM_KEY, this.DATE_TO_KEY, this.DATE_OFFSET_KEY, this.YEAR_FROM_KEY, this.YEAR_TO_KEY];
    return this._appliedFilters().some(f => dateYearFilterKeys.some(key => f.startsWith(`${key}:`)));
  }
}
