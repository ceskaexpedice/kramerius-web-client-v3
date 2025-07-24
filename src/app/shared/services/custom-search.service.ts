import { Injectable, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from './user.service';
import { QueryParamsService } from '../../core/services/QueryParamsManager';
import {filter, take} from 'rxjs';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetAccessibilityTypes,
} from '../../modules/search-results-page/const/facets';

@Injectable({ providedIn: 'root' })
export class CustomSearchService {
  private _appliedFilters = signal<string[]>([]);

  filters = computed(() => this._appliedFilters());

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private userService = inject(UserService);
  private queryParamsService = inject(QueryParamsService);

  initializeFromRoute(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const raw = params['customSearch'];
      const list: string[] = raw ? raw.split(',') as string[] : [];
      this._appliedFilters.set(list);
    });
  }

  isActive(): boolean {
    return this._appliedFilters().length > 0;
  }

  getAppliedFilters(): string[] {
    return this._appliedFilters();
  }

  getSolrFqFilters(): string[] {
    const result: string[] = [];

    for (const key of this._appliedFilters()) {
      const facetKey = key.split(':')[0];
      const value = key.split(':')[1];

      const filterItem = customDefinedFacets.find(facet => facet.facetKey === facetKey);

      switch (facetKey) {
        case customDefinedFacetsEnum.accessibility:
          if (value === FacetAccessibilityTypes.available) {
            const availableLicenses = this.userService.licenses;
            availableLicenses.forEach(license => result.push(`${filterItem?.solrFacetKey}:${license}`));
          }
          break;
        case customDefinedFacetsEnum.whereToSearchModel:
          const selectedItem = filterItem?.data.find(item => item.name === value);
          console.log('selectedItem', selectedItem);
          if (filterItem && selectedItem && selectedItem.fq && selectedItem.fq.length > 0) {
            // If fq is an array, iterate through it and add each fq to the result
            // Otherwise, just add the single fq
            if (Array.isArray(selectedItem.fq)) {
              selectedItem.fq.forEach((fq: string) => {
                if (fq) {
                  result.push(`${filterItem.solrFacetKey}:${fq}`);
                }
              });
            } else if (selectedItem.fq) {
              result.push(`${filterItem.solrFacetKey}:${selectedItem.fq}`);
            }
          }
          break;
        default:
          result.push(`${filterItem?.solrFacetKey}:${value}`);
          break;
      }
    }

    return result;
  }

  toggleFilter(key: string): void {
    const current = this._appliedFilters();
    const isActive = current.includes(key);
    const updated = isActive ? current.filter(k => k !== key) : [...current, key];

    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  getCustomSearchQuery(key: string): string {
    return `customSearch=${key}`;
  }

  removeFilter(key: string): void {
    const updated = this._appliedFilters().filter(k => k !== key);
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  addFilter(key: string): void {
    const current = this._appliedFilters();
    if (current.includes(key)) return; // Filter already applied

    const updated = [...current, key];
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  removeFilterByValue(facetKey: string, value: string): void {
    const filterKey = `${facetKey}:${value}`;
    const updated = this._appliedFilters().filter(k => k !== filterKey);
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  removeAllFiltersByFacetKey(facetKey: string): void {
    const updated = this._appliedFilters().filter(k => !k.startsWith(facetKey + ':'));
    this._appliedFilters.set(updated);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: updated.length > 0 ? updated.join(',') : null,
    });
  }

  getSelectedFilterValue(facetKey: string): string | null {
    const filterItem = customDefinedFacets.find(facet => facet.facetKey === facetKey);
    if (!filterItem) return null;

    const selectedFilter = this._appliedFilters().find(k => k.startsWith(facetKey + ':'));
    if (!selectedFilter) return null;

    const value = selectedFilter.split(':')[1];

    // Special case for accessibility, where we want to return 'all' if no specific value is selected
    if (facetKey === customDefinedFacetsEnum.accessibility && value !== FacetAccessibilityTypes.available) {
      return FacetAccessibilityTypes.all;
    }

    return value;
  }

  clear(): void {
    this._appliedFilters.set([]);

    this.queryParamsService.appendToQueryParams(this.route, {
      customSearch: null,
    });
  }

  apply(): void {
    this._appliedFilters.set(this._appliedFilters());
  }

  getCustomSearchPreview() {
    return this._appliedFilters().map(k => ({
      label: this.getLabelForKey(k),
      key: k
    }));
  }

  private getLabelForKey(key: string): string {
    switch (key) {
      default:
        return key;
    }
  }
}
