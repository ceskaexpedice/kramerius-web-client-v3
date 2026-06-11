import { Component, inject } from '@angular/core';
import { AsyncPipe, NgForOf, NgIf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {
  getCustomDefinedFacets,
  customDefinedFacetsEnum,
  customDefinedFacetsKeys,
  FacetElementType,
  facetKeys,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';
import { SavedListsFilterService } from '../../services/saved-lists-filter.service';

@Component({
  selector: 'app-saved-lists-facet-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, NgIf, FilterCategoryComponent, TranslatePipe],
  styles: [`
    :host {
      display: block;
    }

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
      background: none;
      border: none;
      padding: 0;
      font-family: inherit;
      text-align: inherit;
      width: fit-content;

      i {
        transition: transform 0.3s ease;
        transform: rotate(180deg);
      }

      &.expanded i {
        transform: rotate(0deg);
      }
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
  `],
  template: `
    <div class="filters-content">

      <ng-container *ngFor="let facetKey of getFacetKeys">

        <!-- Date Range Filter -->
        <app-filter-category
          *ngIf="facetKey === customDefinedFacetsEnum.dateRange"
          [label]="customDefinedFacetsEnum.dateRange"
          [facetKey]="customDefinedFacetsEnum.dateRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [loading]="(savedListsFilterService.facetsLoading$ | async) || false"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.dateRange)"
          [dateFrom]="dateFrom"
          [dateTo]="dateTo"
          [dateOffset]="dateOffset"
          (datePickerChange)="onDateRangeChange($event)">
        </app-filter-category>

        <!-- Year Range Filter -->
        <app-filter-category
          *ngIf="facetKey === customDefinedFacetsEnum.yearRange"
          [label]="customDefinedFacetsEnum.yearRange"
          [facetKey]="customDefinedFacetsEnum.yearRange"
          [showToggleExpand]="true"
          [items]="[]"
          [selected]="selectedFilters"
          [loading]="(savedListsFilterService.facetsLoading$ | async) || false"
          [type]="getElementTypeByFacetKey(customDefinedFacetsEnum.yearRange)"
          [yearRangeMin]="defaultYearRangeFrom"
          [yearRangeMax]="currentYear"
          [yearRangeFrom]="yearRangeFrom"
          [yearRangeTo]="yearRangeTo"
          (rangeChange)="onYearRangeChange($event)">
          <button
            class="outlined tertiary submit-year-range-btn w-100"
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
          [loading]="(savedListsFilterService.facetsLoading$ | async) || false"
          [operators]="(filterService.getFiltersWithOperators() | async) || {}"
          [showShowMoreButton]="true"
          [type]="getElementTypeByFacetKey(facetKey)"
          (toggle)="onToggleFacet($event)">

          <ng-container *ngIf="facetKey === customDefinedFacetsEnum.accessibility">

            <button type="button" class="show-licenses--header" [class.expanded]="expandLicenses"
              [attr.aria-expanded]="expandLicenses" aria-controls="saved-lists-license-filter-section"
              (click)="toggleLicenses()">
              {{ expandLicenses ? ('hide-licenses-label' | translate) : ('show-licenses-label' | translate) }}
              <i class="icon-arrow-up-1" aria-hidden="true"></i>
            </button>

            <app-filter-category
              *ngIf="expandLicenses"
              id="saved-lists-license-filter-section"
              [label]="'filter-license-label'"
              [hideLabelVisually]="true"
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
})
export class SavedListsFacetFiltersComponent extends BaseFiltersComponent {
  protected savedListsFilterService = inject(SavedListsFilterService);

  facetKeys = facetKeys;

  protected readonly facetKeysEnum = facetKeysEnum;
  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;

  get getFacetKeys(): string[] {
    // Prepend the custom-accessibility facet (the accessibility toggle group with
    // the nested license list) ahead of the standard Solr facets, mirroring
    // search-filters. license is rendered nested under accessibility, and the
    // where-to-search facet isn't applicable here, so both are excluded from the
    // top-level list.
    return [customDefinedFacetsEnum.accessibility, ...this.facetKeys].filter(
      key => key !== facetKeysEnum.license
    );
  }

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = getCustomDefinedFacets().find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }
}
