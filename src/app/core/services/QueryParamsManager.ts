import { Injectable } from "@angular/core";
import {ActivatedRoute, Params, Router } from "@angular/router";

@Injectable({
  providedIn: 'root'
})
export class QueryParamsService {
  constructor(private router: Router) {}

  /**
   * Get filters from query params
   */
  getFilters(params: Params): string[] {
    const fq = params['fq'];
    return Array.isArray(fq) ? fq : fq ? [fq] : [];
  }

  /**
   * Get filters for a specific facet
   */
  getFiltersByFacet(params: Params, facetKey: string): string[] {
    return this.getFilters(params)
      .filter(f => f.startsWith(facetKey + ':'))
      .map(f => f.split(':')[1]);
  }

  /**
   * Get filters excluding a specific facet
   */
  getFiltersExcludingFacet(params: Params, facetKey: string): string[] {
    return this.getFilters(params)
      .filter(f => !f.startsWith(facetKey + ':'));
  }

  /**
   * Extract all operators from URL
   */
  getOperators(params: Params): Record<string, 'AND' | 'OR'> {
    const operators: Record<string, 'AND' | 'OR'> = {};

    Object.keys(params).forEach(key => {
      if (key.endsWith('_operator')) {
        const field = key.replace('_operator', '');
        operators[field] = params[key] === 'AND' ? 'AND' : 'OR';
      }
    });

    return operators;
  }

  /**
   * Get operator for a specific facet
   */
  getOperatorForFacet(params: Params, facetKey: string): 'AND' | 'OR' {
    const operatorParam = params[`${facetKey}_operator`];
    return operatorParam === 'AND' ? 'AND' : 'OR';
  }

  /**
   * Navigate with updated filters and operators
   */
  updateFilters(
    route: ActivatedRoute,
    facetKey: string,
    selectedValues: string[],
    operator: 'AND' | 'OR'
  ): void {
    const currentParams = route.snapshot.queryParams;
    const otherFilters = this.getFiltersExcludingFacet(currentParams, facetKey);

    // Create new facet filters
    const facetFilters = selectedValues.map(value => `${facetKey}:${value}`);

    // Combine all filters
    const updated = [...otherFilters, ...facetFilters];

    // Create query params
    const queryParams: any = {
      ...currentParams,
      fq: updated.length > 0 ? updated : null,
      [`${facetKey}_operator`]: operator
    };

    // Remove empty arrays and nulls
    Object.keys(queryParams).forEach(key => {
      if (queryParams[key] === null ||
          (Array.isArray(queryParams[key]) && queryParams[key].length === 0)) {
        delete queryParams[key];
      }
    });

    // Navigate
    this.router.navigate([], {
      relativeTo: route,
      queryParams
    });
  }

  /**
   * Remove a single filter
   */
  removeFilter(route: ActivatedRoute, filter: string): void {
    const currentParams = route.snapshot.queryParams;
    const filters = this.getFilters(currentParams);
    const updatedFilters = filters.filter(f => f !== filter);

    this.router.navigate([], {
      relativeTo: route,
      queryParams: {
        ...currentParams,
        fq: updatedFilters.length > 0 ? updatedFilters : null
      }
    });
  }

  /**
   * Clear all filters
   */
  clearAllFilters(route: ActivatedRoute): void {
    const currentParams = route.snapshot.queryParams;

    // Create a copy without 'fq' and operator params
    const newParams = { ...currentParams };
    delete newParams['fq'];

    // Remove all operator params
    Object.keys(newParams).forEach(key => {
      if (key.endsWith('_operator')) {
        delete newParams[key];
      }
    });

    this.router.navigate([], {
      relativeTo: route,
      queryParams: newParams
    });
  }
}
