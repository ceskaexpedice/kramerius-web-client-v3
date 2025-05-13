import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {facetKeys} from '../../const/facets';

@Component({
  selector: 'app-search-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent],
  template: `
    <div class="filters-content">
      <app-filter-category
        *ngFor="let facetKey of facetKeys"
        [label]="facetKey"
        [facetKey]="facetKey"
        [items]="(facets$ | async)?.[facetKey] || []"
        [selected]="selectedFilters"
        [operators]="(filterService.getFiltersWithOperators() | async) || {}"
        [showShowMoreButton]="true"
        (toggle)="onToggleFacet($event)">
      </app-filter-category>
    </div>

  `
})
export class SearchFiltersComponent extends BaseFiltersComponent {
  facetKeys = facetKeys;
}
