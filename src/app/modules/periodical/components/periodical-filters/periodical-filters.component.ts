import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';

@Component({
  selector: 'app-periodical-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent],
  template: `
    <div class="filters-content">
      <app-filter-category
        *ngFor="let facetKey of facetKeys"
        [facetKey]="facetKey"
        [label]="facetKey"
        [items]="(facets$ | async)?.[facetKey] || []"
        [selected]="selectedFilters"
        [operators]="(filterService.getFiltersWithOperators() | async) || {}"
        [showShowMoreButton]="true"
        (toggle)="onToggleFacet($event)">
      </app-filter-category>
    </div>
  `
})
export class PeriodicalFiltersComponent extends BaseFiltersComponent {
  facetKeys = ['years.facet', 'availability.facet'];
}
