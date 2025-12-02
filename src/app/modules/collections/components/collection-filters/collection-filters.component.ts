import { Component } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import { TranslatePipe } from '@ngx-translate/core';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetElementType,
  facetKeys,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';

@Component({
  selector: 'app-collection-filters',
  standalone: true,
  imports: [
    AsyncPipe,
    NgForOf,
    NgIf,
    FilterCategoryComponent,
    TranslatePipe
  ],
  template: `
    <div class="filters-content">
      <ng-container *ngFor="let facetKey of getFacetKeys">
        <app-filter-category
          [label]="facetKey"
          [facetKey]="facetKey"
          [items]="(facets$ | async)?.[facetKey] || []"
          [selected]="selectedFilters"
          [operators]="(filterService.getFiltersWithOperators() | async) || {}"
          [showShowMoreButton]="true"
          [type]="getElementTypeByFacetKey(facetKey)"
          (toggle)="onToggleFacet($event)">

          <!-- Licenses nested under accessibility -->
          <ng-container *ngIf="facetKey === customDefinedFacetsEnum.accessibility">
            <div class="show-licenses--header"
                 [class.expanded]="expandLicenses"
                 (click)="toggleLicenses()">
              {{ 'show-licenses-label' | translate }} <i class="icon-arrow-up"></i>
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

        <!-- Year Range Filter (after model facet) -->
        <app-filter-category
          *ngIf="facetKey === facetKeysEnum.model"
          [label]="customDefinedFacetsEnum.yearRange"
          [facetKey]="customDefinedFacetsEnum.yearRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.yearRange)"
          [yearRangeMin]="defaultYearRangeFrom"
          [yearRangeMax]="currentYear"
          [yearRangeFrom]="yearRangeFrom"
          [yearRangeTo]="yearRangeTo"
          (rangeChange)="onYearRangeChange($event)">
          <button
            class="outlined submit-year-range-btn w-100"
            [class.disabled]="!hasYearRangeChanged"
            [disabled]="!hasYearRangeChanged"
            (click)="submitYearRange()">
            {{ 'submit' | translate }}
          </button>
        </app-filter-category>

        <!-- Date Range Filter (after model facet) -->
        <app-filter-category
          *ngIf="facetKey === facetKeysEnum.model"
          [label]="customDefinedFacetsEnum.dateRange"
          [facetKey]="customDefinedFacetsEnum.dateRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.dateRange)"
          [dateFrom]="dateFrom"
          [dateTo]="dateTo"
          [dateOffset]="dateOffset"
          (datePickerChange)="onDateRangeChange($event)">
          <button
            class="outlined submit-date-range-btn w-100"
            [class.disabled]="!hasDateRangeChanged"
            [disabled]="!hasDateRangeChanged"
            (click)="submitDateRange()">
            {{ 'submit' | translate }}
          </button>
        </app-filter-category>
      </ng-container>
    </div>
  `,
  styles: [`
    .show-licenses--header {
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: var(--spacing-x2);
      color: var(--color-text-base);
      margin-top: var(--spacing-x4);
      font-size: var(--font-size-small);
      font-weight: 500;

      i {
        transition: transform 0.3s ease;
        transform: rotate(180deg);
      }

      &.expanded i {
        transform: rotate(0deg);
      }
    }

    .submit-year-range-btn,
    .submit-date-range-btn {
      margin-top: var(--spacing-x3);
      cursor: pointer;
      font-size: calc(12px * var(--accessibility-text-scale));
      transition: background-color 0.2s ease;

      &.disabled,
      &:disabled {
        cursor: not-allowed;
      }
    }
  `]
})
export class CollectionFiltersComponent extends BaseFiltersComponent {
  // Define which standard facets to display (same as search-filters)
  facetKeys = facetKeys;

  // Custom facets
  customDefinedFacetsKeys = [customDefinedFacetsEnum.accessibility];

  get getFacetKeys(): string[] {
    // Filter out licenses (shown under accessibility) and range filters (shown separately)
    return [...this.customDefinedFacetsKeys, ...this.facetKeys]
      .filter(key =>
        key !== facetKeysEnum.license &&
        key !== customDefinedFacetsEnum.dateRange &&
        key !== customDefinedFacetsEnum.yearRange
      );
  }

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  protected readonly facetKeysEnum = facetKeysEnum;
  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
}
