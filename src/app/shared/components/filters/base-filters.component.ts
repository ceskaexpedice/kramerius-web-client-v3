import { Component, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {map, Observable} from 'rxjs';
import {FILTER_SERVICE, FilterService} from '../../services/filter.service';
import {ONLINE_LICENSES} from '../../../core/solr/solr-misc';
import {customDefinedFacets, facetKeysEnum} from '../../../modules/search-results-page/const/facets';
import {FacetItem} from '../../../modules/models/facet-item';
import {CustomSearchService} from '../../services/custom-search.service';
import {UserService} from '../../services/user.service';
import {ENVIRONMENT} from '../../../app.config';

@Component({ template: '' })
export abstract class BaseFiltersComponent {
  abstract facetKeys: string[];
  selectedFilters: string[] = [];
  facets$: Observable<any> = new Observable<any>();

  expandLicenses = false;

  // Year range properties
  currentYear = new Date().getFullYear();
  defaultYearRangeFrom = ENVIRONMENT.dateRangeStartYear;
  yearRangeFrom = ENVIRONMENT.dateRangeStartYear;
  yearRangeTo = this.currentYear;
  private pendingYearRangeFrom = 0;
  private pendingYearRangeTo = this.currentYear;
  hasYearRangeChanged = false;

  hasDateRangeChanged = false;

  constructor(
    @Inject(FILTER_SERVICE) protected filterService: FilterService,
    protected route: ActivatedRoute,
    protected customSearchService: CustomSearchService,
    protected userService: UserService,
    protected router: Router
  ) {
    this.initializeFilters();

    this.getFacets();

    this.sortFacets();

    this.checkIfSomeOfLicensesSelected();

    this.initializeYearRange();
  }

  getFacets() {
    this.facets$ = this.filterService.getFacets().pipe(
      map(facets => {
        const updated = { ...facets };

        if (updated[facetKeysEnum.license]) {
          updated[facetKeysEnum.license] = updated[facetKeysEnum.license].map((item: FacetItem) => ({
            ...item,
            available: this.userService.licenses.includes(item.name),
            icon: this.userService.licenses.includes(item.name)
              ? 'icon-eye'
              : ONLINE_LICENSES.includes(item.name)
                ? 'icon-lock'
                : 'icon-home'
          }));
        }

        return updated;
      })
    );
  }

  sortFacets() {
    // if facetKey is license, sort by available first, then ONLINE_LICENSES, then alphabetically
    this.facets$ = this.facets$.pipe(
      map(facets => {
        if (facets[facetKeysEnum.license]) {
          facets[facetKeysEnum.license].sort((a: FacetItem, b: FacetItem) => {
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            if (ONLINE_LICENSES.includes(a.name) && !ONLINE_LICENSES.includes(b.name)) return -1;
            if (!ONLINE_LICENSES.includes(a.name) && ONLINE_LICENSES.includes(b.name)) return 1;
            return a.name.localeCompare(b.name);
          });
        }
        return facets;
      })
    );
  }

  protected initializeFilters(): void {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      const fqFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];

      const customRaw = params['customSearch'];
      const customFilters = Array.isArray(customRaw)
        ? customRaw
        : customRaw
          ? customRaw.split(',')
          : [];

      this.selectedFilters = [...fqFilters, ...customFilters];
    });
  }

  checkIfSomeOfLicensesSelected() {
    const selected = this.selectedFilters.some(filter => {
      const [facetKey, facetValue] = filter.split(':');
      return facetKey === facetKeysEnum.license && this.userService.licenses.includes(facetValue);
    });

    this.expandLicenses = selected;
  }

  onToggleFacet(fullValue: string): void {
    console.log(fullValue);
    // fullValue is expected to be in the format 'facetKey:facetValue'
    // we need to check if facetKey is in customDefinedFacets, if so, we need to toggle the filter using the customSearchService
    const [facetKey, facetValue] = fullValue.split(':');
    const isCustom = customDefinedFacets.find(c => c.facetKey === facetKey);

    this.filterService.resetPage();

    if (isCustom) {
      this.customSearchService.toggleFilter(fullValue);
      return;
    }
    this.filterService.toggleFilter(this.route, fullValue);
  }

  toggleLicenses() {
    this.expandLicenses = !this.expandLicenses;
  }

  private initializeYearRange() {
    // Check if there are existing year range parameters
    const queryParams = this.route.snapshot.queryParams;
    const yearFrom = queryParams['yearFrom'];
    const yearTo = queryParams['yearTo'];

    if (yearFrom !== undefined) {
      this.yearRangeFrom = parseInt(yearFrom, 10) || 0;
      this.pendingYearRangeFrom = this.yearRangeFrom;
    }

    if (yearTo !== undefined) {
      this.yearRangeTo = parseInt(yearTo, 10) || this.currentYear;
      this.pendingYearRangeTo = this.yearRangeTo;
    }
  }

  onYearRangeChange(range: { from: number; to: number }) {
    this.pendingYearRangeFrom = range.from;
    this.pendingYearRangeTo = range.to;

    // Check if values have changed from current applied values
    this.hasYearRangeChanged =
      this.pendingYearRangeFrom !== this.yearRangeFrom ||
      this.pendingYearRangeTo !== this.yearRangeTo;
  }

  submitDateRange() {
    if (!this.hasDateRangeChanged) return;


    this.hasDateRangeChanged = false;
  }

  submitYearRange() {
    if (!this.hasYearRangeChanged) return;

    // Update the applied values
    this.yearRangeFrom = this.pendingYearRangeFrom;
    this.yearRangeTo = this.pendingYearRangeTo;

    // Navigate with year range parameters
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        yearFrom: this.yearRangeFrom === 0 ? null : this.yearRangeFrom,
        yearTo: this.yearRangeTo === this.currentYear ? null : this.yearRangeTo,
        page: 1 // Reset to first page when filters change
      },
      queryParamsHandling: 'merge'
    });

    this.hasYearRangeChanged = false;
  }
}
