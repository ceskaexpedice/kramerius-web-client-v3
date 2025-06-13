import { Component, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { FilterService } from '../../services/filter.service';

@Component({ template: '' })
export abstract class BaseFiltersComponent {
  abstract facetKeys: string[];
  selectedFilters: string[] = [];
  facets$: Observable<any>;

  constructor(
    @Inject('FilterService') protected filterService: FilterService,
    protected route: ActivatedRoute
  ) {
    this.initializeFilters();
    this.facets$ = this.filterService.getFacets();
  }

  protected initializeFilters(): void {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      this.selectedFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    });
  }

  onToggleFacet(fullValue: string): void {
    console.log(fullValue);
    this.filterService.toggleFilter(this.route, fullValue);
  }
}
