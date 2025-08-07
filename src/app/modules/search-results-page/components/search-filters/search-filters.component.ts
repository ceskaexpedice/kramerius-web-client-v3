import { Component } from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  customDefinedFacetsKeys, FacetElementType,
  facetKeys,
  facetKeysEnum,
} from '../../const/facets';
import {TranslatePipe} from '@ngx-translate/core';
import {RangeSliderComponent} from '../../../../shared/components/range-slider/range-slider.component';
import {DatePickerComponent} from '../../../../shared/components/date-picker/date-picker.component';

@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, NgIf, TranslatePipe, RangeSliderComponent, DatePickerComponent],
  template: `
    <div class="filters-content">

      <ng-container
        *ngFor="let facetKey of getFacetKeys; let i = index"
      >
        <app-filter-category
          [label]="facetKey"
          [facetKey]="facetKey"
          [items]="(facets$ | async)?.[facetKey] || []"
          [selected]="selectedFilters"
          [operators]="(filterService.getFiltersWithOperators() | async) || {}"
          [showShowMoreButton]="true"
          [type]="getElementTypeByFacetKey(facetKey)"
          (toggle)="onToggleFacet($event)">

          <ng-container categoryContent *ngIf="facetKey === customDefinedFacetsEnum.accessibility">

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

        <div *ngIf="facetKey === customDefinedFacetsEnum.model" class="date-range-section">
          <h3 class="filter-section-title">{{ 'date' | translate }}</h3>
          <app-date-picker
            (datePickerChange)="onDateRangeChange($event)">
          </app-date-picker>
          <button
            class="outlined submit-year-range-btn w-100"
            [class.disabled]="!hasDateRangeChanged"
            [disabled]="!hasDateRangeChanged"
            (click)="submitDateRange()">
            {{ 'apply-date-range' | translate }}
          </button>

          <hr>

        </div>

        <!-- Year Range Slider - Insert after model filter -->
        <div *ngIf="facetKey === customDefinedFacetsEnum.model" class="year-range-section">
          <h3 class="filter-section-title">{{ 'year-range' | translate }}</h3>
          <app-range-slider
            [min]="defaultYearRangeFrom"
            [max]="currentYear"
            [step]="1"
            [initialFrom]="yearRangeFrom"
            [initialTo]="yearRangeTo"
            (rangeChange)="onYearRangeChange($event)"
            [showInputNumberStepper]="false"
          ></app-range-slider>
          <button
            class="outlined submit-year-range-btn w-100"
            [class.disabled]="!hasYearRangeChanged"
            [disabled]="!hasYearRangeChanged"
            (click)="submitYearRange()">
            {{ 'apply-year-range' | translate }}
          </button>
          <hr>
        </div>

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
        font-size: 13px;
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
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-base);
        margin-bottom: var(--spacing-x3);
      }

      .submit-year-range-btn {
        margin-top: var(--spacing-x3);
        cursor: pointer;
        font-size: 12px;
        transition: background-color 0.2s ease;

        &.disabled, &:disabled {
          cursor: not-allowed;
        }
      }

  `]
})
export class SearchFiltersComponent extends BaseFiltersComponent {

  facetKeys = facetKeys;

  get getFacetKeys(): string[] {
    // we are showing licenses under accessibility facet so we need to return all facet keys except 'licenses.facet'
    return [...customDefinedFacetsKeys, ...this.facetKeys].filter(key => key !== facetKeysEnum.license);
  }

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  protected readonly facetKeysEnum = facetKeysEnum;
  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
}
