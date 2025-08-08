import {Component, inject} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetElementType,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';
import {PeriodicalService} from '../../../../shared/services/periodical.service';

@Component({
  selector: 'app-periodical-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, TranslatePipe, AutocompleteComponent, NgIf],
  styles: `
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

    .year-range-section {
      margin-bottom: var(--spacing-x4);
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
  `,
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search-in-periodicals--placeholder' | translate"
        [size]="'sm'"
        [minTermLength]="2"
        [initialValue]="periodicalService.inputSearchTerm"
        [getSuggestions]="periodicalService.getSuggestionsFn"
        [showHelpButton]="false"
        [showMicrophoneButton]="false"
        [showSubmitButton]="false"
        (search)="periodicalService.onSearch($event)"
        [inputTerm]="periodicalService.searchTerm"
        [showHistorySuggestions]="true"
        (suggestionSelected)="periodicalService.onSuggestionSelected($event)">
      </app-autocomplete>

      <hr>

      <ng-container
        *ngFor="let facetKey of getFacetKeys"
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

      <!-- Year Range Filter -->
      <app-filter-category
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
        (rangeChange)="onYearRangeChange($event)"
      >
        <button
          class="outlined submit-year-range-btn w-100"
          [class.disabled]="!hasYearRangeChanged"
          [disabled]="!hasYearRangeChanged"
          (click)="submitYearRange()">
          {{ 'apply-year-range' | translate }}
        </button>
      </app-filter-category>

      <!-- Date Range Filter -->
      <app-filter-category
        [label]="customDefinedFacetsEnum.dateRange"
        [facetKey]="customDefinedFacetsEnum.dateRange"
        [showToggleExpand]="true"
        [items]="[]"
        [selected]="selectedFilters"
        [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.dateRange)"
        [dateFrom]="dateFrom"
        [dateTo]="dateTo"
        [dateOffset]="dateOffset"
        (datePickerChange)="onDateRangeChange($event)"
      >
        <button
          class="outlined submit-year-range-btn w-100"
          [class.disabled]="!hasDateRangeChanged"
          [disabled]="!hasDateRangeChanged"
          (click)="submitDateRange()">
          {{ 'apply-date-range' | translate }}
        </button>
      </app-filter-category>

    </div>
  `
})
export class PeriodicalFiltersComponent extends BaseFiltersComponent {
  public periodicalService = inject(PeriodicalService);

  facetKeys = [];
  customDefinedFacetsKeys = [customDefinedFacetsEnum.accessibility];

  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
  protected readonly facetKeysEnum = facetKeysEnum;

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  get getFacetKeys(): string[] {
    // we are showing licenses under accessibility facet so we need to return all facet keys except 'licenses.facet'
    return [...this.customDefinedFacetsKeys, ...this.facetKeys].filter(key => key !== facetKeysEnum.license);
  }
}
