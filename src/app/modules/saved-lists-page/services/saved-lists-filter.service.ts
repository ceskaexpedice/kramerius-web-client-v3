import { inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Observable } from 'rxjs';
import { Store } from '@ngrx/store';
import { BaseFilterService } from '../../../shared/services/base-filter.service';
import * as FoldersSelectors from '../state/folders.selectors';

/**
 * FilterService implementation for the saved-lists (folder) page.
 *
 * Facets are produced as a side effect of the folder-items Solr search
 * (see FoldersService.searchFolderItems) and stored in folder NgRx state.
 * Selecting a facet writes it to the URL (fq + per-facet operator) and
 * re-runs the folder search so results and counts reflect the selection.
 */
@Injectable({ providedIn: 'root' })
export class SavedListsFilterService extends BaseFilterService {
  private store = inject(Store);

  getBaseFilters(): Observable<string[]> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getFilters(params))
    );
  }

  getFacets(): Observable<any> {
    return this.store.select(FoldersSelectors.selectFolderFacets);
  }

  override facetsLoading$: Observable<boolean | undefined> =
    this.store.select(FoldersSelectors.selectFolderSearchResultsLoading);

  getFiltersWithOperators(): Observable<Record<string, string>> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getOperators(params))
    );
  }

  toggleFilter(route: ActivatedRoute, fullValue: string): void {
    this.resetPage();

    const [facetKey, value] = fullValue.split(':');
    const params = route.snapshot.queryParams;
    const currentValues = this.queryParamsService.getFiltersByFacet(params, facetKey);

    const isSelected = currentValues.includes(value);
    const newValues = isSelected
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];

    const operator = this.queryParamsService.getOperatorForFacet(params, facetKey);

    // Update the URL filters. The saved-lists page watches fq query params and
    // re-runs the folder search (which reads fq from the URL) once navigation
    // completes — guaranteeing the URL reflects the selection first.
    this.queryParamsService.updateFilters(route, facetKey, newValues, operator);
  }
}
