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

@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, NgIf, TranslatePipe],
  template: `
    <div class="filters-content">

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
