import { Injectable } from '@angular/core';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { Router, ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class SearchService {

  constructor(
    private router: Router
  ) { }

  search(query: string): void {
    this.router.navigate([`/${APP_ROUTES_ENUM.SEARCH_RESULTS}`], { queryParams: { query } });
  }

  updateFilters(route: ActivatedRoute, facetKey: string, selectedValues: string[], useOrOperator: boolean = true): void {
    const fq = route.snapshot.queryParams['fq'];
    const otherFilters = (Array.isArray(fq) ? fq : fq ? [fq] : []).filter(
      f => !f.startsWith(facetKey + ':')
    );

    let facetFilters: string[] = [];

    if (selectedValues.length > 0) {

      facetFilters = selectedValues.map(value => `${facetKey}:${value}`);

    }

    const updated = [
      ...otherFilters,
      ...facetFilters
    ];

    const queryParams: any = { fq: updated };

    // if useOrOperator is true, add to url param facetKey_operator=AND
    if (useOrOperator) {
      queryParams[`${facetKey}_operator`] = 'AND';
    } else {
      // delete the operator param if it exists
      queryParams[`${facetKey}_operator`] = 'OR';
    }

    this.router.navigate([], {
      relativeTo: route,
      queryParams,
      queryParamsHandling: 'merge'
    });
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    const facetKey = fullValue.split(':')[0];
    const fq = route.snapshot.queryParams['fq'];
    const currentFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    const currentFacetFilters = currentFilters.filter(f => f.startsWith(facetKey + ':'));

    let newFilters: string[];

    if (currentFacetFilters.includes(fullValue)) {
      // Odstránime filter
      newFilters = currentFilters.filter(f => f !== fullValue);
    } else {
      // Pridáme filter
      newFilters = [...currentFilters, fullValue];
    }

    this.router.navigate([], {
      relativeTo: route,
      queryParams: { fq: newFilters },
      queryParamsHandling: 'merge'
    });
  }

}
