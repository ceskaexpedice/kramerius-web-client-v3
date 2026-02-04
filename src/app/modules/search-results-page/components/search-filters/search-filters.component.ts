import { ChangeDetectorRef, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  customDefinedFacetsKeys, FacetElementType,
  facetKeys,
  facetKeysEnum,
} from '../../const/facets';
import { TranslatePipe } from '@ngx-translate/core';
import { DisplayConfigService } from '../../../../shared/services/display-config.service';
import { Subscription } from 'rxjs';
import { SearchService } from '../../../../shared/services/search.service';

@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, NgIf, TranslatePipe],
  template: `
    <div class="filters-content">

      <ng-container
        *ngFor="let facetKey of getFacetKeys"
      >
        <!-- Date Range Filter -->
        <app-filter-category
          *ngIf="facetKey === customDefinedFacetsEnum.dateRange"
          [label]="customDefinedFacetsEnum.dateRange"
          [facetKey]="customDefinedFacetsEnum.dateRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [loading]="(searchService.facetsLoading$ | async) || false"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.dateRange)"
          [dateFrom]="dateFrom"
          [dateTo]="dateTo"
          [dateOffset]="dateOffset"
          (datePickerChange)="onDateRangeChange($event)"
        >
        </app-filter-category>

        <!-- Year Range Filter -->
        <app-filter-category
          *ngIf="facetKey === customDefinedFacetsEnum.yearRange"
          [label]="customDefinedFacetsEnum.yearRange"
          [facetKey]="customDefinedFacetsEnum.yearRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [loading]="(searchService.facetsLoading$ | async) || false"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.yearRange)"
          [yearRangeMin]="defaultYearRangeFrom"
          [yearRangeMax]="currentYear"
          [yearRangeFrom]="yearRangeFrom"
          [yearRangeTo]="yearRangeTo"
          (rangeChange)="onYearRangeChange($event)"
        >
          <button
            class="outlined submit-year-range-btn w-100"
            [class.disabled]="!hasYearRangeChanged"
            [disabled]="!hasYearRangeChanged"
            (click)="submitYearRange()">
            {{ 'submit' | translate }}
          </button>
        </app-filter-category>

        <!-- Regular Facet Filters -->
        <app-filter-category
          *ngIf="facetKey !== customDefinedFacetsEnum.dateRange && facetKey !== customDefinedFacetsEnum.yearRange"
          [label]="facetKey"
          [facetKey]="facetKey"
          [items]="(facets$ | async)?.[facetKey] || []"
          [selected]="selectedFilters"
          [loading]="(searchService.facetsLoading$ | async) || false"
          [operators]="(filterService.getFiltersWithOperators() | async) || {}"
          [showShowMoreButton]="true"
          [type]="getElementTypeByFacetKey(facetKey)"
          (toggle)="onToggleFacet($event)">

          <ng-container *ngIf="facetKey === customDefinedFacetsEnum.accessibility">

            <div class="show-licenses--header" [class.expanded]="expandLicenses" (click)="toggleLicenses()">
              {{ 'show-licenses-label' | translate }} <i class="icon-arrow-up-1"></i>
            </div>

            <app-filter-category
              *ngIf="expandLicenses"
              [facetKey]="facetKeysEnum.license"
              [items]="(facets$ | async)?.[facetKeysEnum.license] || []"
              [selected]="selectedFilters"
              [operators]="(filterService.getFiltersWithOperators() | async) || {}"
              [showShowMoreButton]="false"
              [showBottomBorder]="false"
              [showToggleExpand]="false"
              (toggle)="onToggleFacet($event)">
            </app-filter-category>

          </ng-container>

        </app-filter-category>

      </ng-container>

    </div>

  `,
  styles: [`
      .filters-content {
        position: relative;
        min-height: 200px;
      }

      .show-licenses--header {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: var(--spacing-x2);
        color: var(--color-text-base);
        font-size: var(--font-size-small);
        margin-top: var(--spacing-x2);
        font-weight: 500;

        i {
          transition: transform 0.3s ease;
          transform: rotate(180deg);
        }

        &.expanded i {
          transform: rotate(0deg);
        }
      }

      .filter-section-title {
        font-size: var(--font-size-small);
        font-weight: 600;
        color: var(--color-text-base);
        margin-bottom: var(--spacing-x3);
      }

      .submit-year-range-btn {
        margin-top: var(--spacing-x3);
        cursor: pointer;
        font-size: calc(12px * var(--accessibility-text-scale));
        transition: background-color 0.2s ease;

        &.disabled, &:disabled {
          cursor: not-allowed;
        }
      }

      :host {
        display: block;
      }
  `]
})
export class SearchFiltersComponent extends BaseFiltersComponent implements OnInit, OnDestroy {

  facetKeys = facetKeys;
  protected searchService = inject(SearchService);
  private displayConfigService = inject(DisplayConfigService);
  private cdr = inject(ChangeDetectorRef);
  private visibleFacetKeys: string[] = [];
  private configSubscription?: Subscription;

  override ngOnInit() {
    super.ngOnInit();

    this.configSubscription = this.displayConfigService.displayConfig$.subscribe(config => {
      const visibleFilters = this.displayConfigService.getVisibleFacetFilters();
      this.visibleFacetKeys = visibleFilters.map(filter => filter.facetKey);
      this.cdr.markForCheck();
    });
  }

  override ngOnDestroy() {
    super.ngOnDestroy();

    this.configSubscription?.unsubscribe();
  }

  get getFacetKeys(): string[] {
    if (this.visibleFacetKeys.length > 0) {
      return this.visibleFacetKeys.filter(key => key !== facetKeysEnum.license);
    }

    return [...customDefinedFacetsKeys, ...this.facetKeys].filter(key => key !== facetKeysEnum.license);
  }

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  protected readonly facetKeysEnum = facetKeysEnum;
  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
}
