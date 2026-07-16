import { inject, Injectable } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { map, Observable, of, switchMap, take } from 'rxjs';
import { Store } from '@ngrx/store';
import { BaseFilterService } from '../../../shared/services/base-filter.service';
import { FacetPageQuery, FacetPageResult } from '../../../shared/services/filter.service';
import { SolrResponseParser } from '../../../core/solr/solr-response-parser';
import { FoldersService } from './folders.service';
import { FolderSearchFiltersBuilder } from './folder-search-filters.builder';
import * as FoldersSelectors from '../state/folders.selectors';

/**
 * FilterService implementation for the saved-lists (folder) page.
 *
 * Facets are produced as a side effect of the folder search (the shared Solr
 * pipeline scoped by folder roots, see FoldersEffects) and stored in folder
 * NgRx state.
 * Selecting a facet writes it to the URL (fq + per-facet operator) and
 * re-runs the folder search so results and counts reflect the selection.
 */
@Injectable({ providedIn: 'root' })
export class SavedListsFilterService extends BaseFilterService {
  private store = inject(Store);
  private foldersService = inject(FoldersService);
  private folderSearchFiltersBuilder = inject(FolderSearchFiltersBuilder);

  getBaseFilters(): Observable<string[]> {
    return this.route.queryParams.pipe(
      map(params => this.queryParamsService.getFilters(params))
    );
  }

  getFacets(): Observable<any> {
    return this.store.select(FoldersSelectors.selectFolderFacets);
  }

  /**
   * Folder-scoped facet loading for the "show more" dialog. Unlike the basic
   * search index, facets here must be restricted to the selected folder's items
   * (pid: scope) plus the same availability/custom filters the folder result
   * search applies — so we query through FoldersService rather than the shared
   * basic-index helper.
   */
  override loadFacetPage(facetKey: string, query: FacetPageQuery): Observable<FacetPageResult> {
    return this.store.select(FoldersSelectors.selectActiveFolderItems).pipe(
      take(1),
      switchMap(items => {
        const itemIds = items.map(item => item.id);
        if (itemIds.length === 0) {
          return of({ items: [], totalCount: 0 });
        }

        const filters = this.folderSearchFiltersBuilder.build();
        const activeSelections = new Set(
          (filters.fqFilters ?? [])
            .filter(f => f.startsWith(facetKey + ':'))
            .map(f => f.split(':')[1])
        );

        return this.foldersService.loadFolderFacetPage(
          itemIds,
          facetKey,
          query.pendingSelection,
          query.pendingOperator,
          {
            searchTerm: query.contains || '',
            limit: query.limit,
            offset: query.offset,
            sortBy: query.sortBy
          },
          filters
        ).pipe(
          map(({ response, facetField }) => {
            const parsed = SolrResponseParser.parseFacet(
              response.facet_counts?.facet_fields?.[facetField] || []
            );
            return {
              items: this.filterUtilities.sortWithSelectedOnTop(parsed, activeSelections),
              totalCount: parsed.length
            };
          })
        );
      })
    );
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
