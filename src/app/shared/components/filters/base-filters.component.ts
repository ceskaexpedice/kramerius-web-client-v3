import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {combineLatest, map, Observable, Subscription} from 'rxjs';
import {FILTER_SERVICE, FilterService} from '../../services/filter.service';
import {ONLINE_LICENSES} from '../../../core/solr/solr-misc';
import { toObservable } from '@angular/core/rxjs-interop';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  facetKeysEnum,
} from '../../../modules/search-results-page/const/facets';
import {FacetItem} from '../../../modules/models/facet-item';
import {CustomSearchService} from '../../services/custom-search.service';
import {UserService} from '../../services/user.service';
import {ENVIRONMENT} from '../../../app.config';
import {DatePickerOutput} from '../date-picker/date-picker.component';

@Component({ template: '' })
export abstract class BaseFiltersComponent implements OnInit, OnDestroy {
  abstract facetKeys: string[];
  selectedFilters: string[] = [];
  facets$: Observable<any> = new Observable<any>();
  private userLicenses$: Observable<string[]>;

  expandLicenses = false;

  // Year range properties
  currentYear = new Date().getFullYear();
  defaultYearRangeFrom = ENVIRONMENT.dateRangeStartYear;
  private pendingYearRangeFrom = 0;
  private pendingYearRangeTo = this.currentYear;
  hasYearRangeChanged = false;

  // Date range properties
  private pendingDateFrom: Date | null = null;
  private pendingDateTo: Date | null = null;
  private pendingDateOffset: number = 0;
  hasDateRangeChanged = false;

  // Subscriptions
  private subscriptions: Subscription[] = [];

  // Get current values from CustomSearchService
  get yearRangeFrom(): number {
    return this.customSearchService.getYearFrom() ?? this.defaultYearRangeFrom;
  }

  get yearRangeTo(): number {
    return this.customSearchService.getYearTo() ?? this.currentYear;
  }

  get dateFrom(): Date | null {
    return this.customSearchService.getDateFrom();
  }

  get dateTo(): Date | null {
    return this.customSearchService.getDateTo();
  }

  get dateOffset(): number {
    return this.customSearchService.getDateOffset();
  }

  constructor(
    @Inject(FILTER_SERVICE) protected filterService: FilterService,
    protected route: ActivatedRoute,
    protected customSearchService: CustomSearchService,
    protected userService: UserService,
    protected router: Router
  ) {
    this.userLicenses$ = toObservable(this.userService.licenses$);
  }

  ngOnInit() {
    this.initializeFilters();

    this.getFacets();

    this.enrichFacetsWithUserData();

    this.sortFacets();

    this.checkIfSomeOfLicensesSelected();

    // Initialize CustomSearchService first, then initialize ranges
    this.customSearchService.initializeFromRoute();

    // Wait a tick for the service to initialize, then set initial values
    setTimeout(() => {
      this.initializeYearRange();
      this.initializeDateRange();
    }, 0);

    // Watch for route parameter changes to update component values
    const routeSubscription = this.route.queryParams.subscribe(params => {
      // Re-initialize CustomSearchService and then ranges
      this.customSearchService.initializeFromRoute();
      setTimeout(() => {
        this.initializeYearRange();
        this.initializeDateRange();
      }, 0);
    });

    this.subscriptions.push(routeSubscription);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  getFacets() {
    this.facets$ = this.filterService.getFacets();
  }

  enrichFacetsWithUserData() {
    this.facets$ = combineLatest([
      this.facets$,
      this.userLicenses$
    ]).pipe(
      map(([facets, userLicenses]) => {
        const updated = { ...facets };

        // Add availability and icons to license facet
        if (updated[facetKeysEnum.license]) {
          updated[facetKeysEnum.license] = updated[facetKeysEnum.license].map((item: FacetItem) => ({
            ...item,
            available: userLicenses.includes(item.name),
            icon: userLicenses.includes(item.name)
              ? 'icon-eye'
              : ONLINE_LICENSES.includes(item.name)
                ? 'icon-lock'
                : 'icon-home-1'
          }));
        }

        // Recalculate accessibility facet counts
        if (updated[customDefinedFacetsEnum.accessibility]) {
          const licenseFacet = updated[facetKeysEnum.license];

          updated[customDefinedFacetsEnum.accessibility] = updated[customDefinedFacetsEnum.accessibility].map((item: FacetItem) => {
            if (item.name === 'available') {
              const newCount = userLicenses.reduce((sum, lic) => {
                return sum + (licenseFacet?.find((f: FacetItem) => f.name === lic)?.count || 0);
              }, 0);
              return { ...item, count: newCount };
            }
            return item;
          });
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
    // Initialize pending values from current service values
    this.pendingYearRangeFrom = this.yearRangeFrom;
    this.pendingYearRangeTo = this.yearRangeTo;
    this.hasYearRangeChanged = false;
  }

  onYearRangeChange(range: { from: number; to: number }) {
    this.pendingYearRangeFrom = range.from;
    this.pendingYearRangeTo = range.to;

    // Check if values have changed from current applied values
    this.hasYearRangeChanged =
      this.pendingYearRangeFrom !== this.yearRangeFrom ||
      this.pendingYearRangeTo !== this.yearRangeTo;
  }

  onDateRangeChange(dateRange: DatePickerOutput) {
    this.pendingDateFrom = dateRange.dateFrom;
    this.pendingDateTo = dateRange.dateTo;
    this.pendingDateOffset = dateRange.offset;

    // Check if values have changed from current applied values
    this.hasDateRangeChanged =
      this.pendingDateFrom?.getTime() !== this.dateFrom?.getTime() ||
      this.pendingDateTo?.getTime() !== this.dateTo?.getTime() ||
      this.pendingDateOffset !== this.dateOffset;

    this.submitDateRange();
  }

  submitDateRange() {
    if (!this.hasDateRangeChanged) return;

    // Use CustomSearchService to set date range
    this.customSearchService.setDateRange(
      this.pendingDateFrom,
      this.pendingDateTo,
      this.pendingDateOffset
    );

    this.hasDateRangeChanged = false;
  }

  private formatDateForUrl(date: Date): string {
    return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
  }

  private initializeDateRange() {
    // Initialize pending values from current service values
    this.pendingDateFrom = this.dateFrom;
    this.pendingDateTo = this.dateTo;
    this.pendingDateOffset = this.dateOffset;
    this.hasDateRangeChanged = false;
  }

  submitYearRange() {
    if (!this.hasYearRangeChanged) return;

    // Use CustomSearchService to set year range
    this.customSearchService.setYearRange(
      this.pendingYearRangeFrom,
      this.pendingYearRangeTo
    );

    this.hasYearRangeChanged = false;
  }
}
