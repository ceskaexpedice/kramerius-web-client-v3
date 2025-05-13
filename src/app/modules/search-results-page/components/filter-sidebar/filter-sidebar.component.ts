import { Component } from '@angular/core';
import {selectFacets} from '../../state/search.selectors';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {FilterCategoryComponent} from '../../../../shared/components/filter-category/filter-category.component';
import {SearchService} from '../../../../shared/services/search.service';
import {facetKeys} from '../../const/facets';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    FilterCategoryComponent,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent {
  facetKeys: string[] = facetKeys;

  facets$ = this.store.select(selectFacets);
  operators$ = this.searchService.getFiltersWithOperators();
  selectedFilters: string[] = [];

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private searchService: SearchService
  ) {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      this.selectedFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    });
  }

  onToggleFacet(fullValue: string) {
    this.searchService.toggleFilter(this.route, fullValue);
  }
}
