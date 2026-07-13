import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { QueryParamsService } from '../../../core/services/QueryParamsManager';
import { UserService } from '../../../shared/services/user.service';
import { buildYearRangeQuery, buildDateMinRangeQuery } from '../../../shared/utils/date-range-query';
import { FolderSearchFilters } from './folders.service';
import { customDefinedFacetsEnum } from '../../search-results-page/const/facets';

/**
 * Assembles the extra filter dimensions for a folder-items Solr search from the
 * current URL + CustomSearchService. Shared by FoldersEffects (the folder result
 * search) and SavedListsFilterService (the "show more" facet dialog) so both apply
 * exactly the same scope.
 */
@Injectable({ providedIn: 'root' })
export class FolderSearchFiltersBuilder {
  private router = inject(Router);
  private customSearchService = inject(CustomSearchService);
  private queryParamsService = inject(QueryParamsService);
  private userService = inject(UserService);

  build(): FolderSearchFilters {
    const params = this.urlParams();

    // Sync custom-search state (accessibility, where-to-search, ranges) from URL.
    this.customSearchService.initializeFromRoute();

    const queryClauses = [
      buildYearRangeQuery(params),
      buildDateMinRangeQuery(params)
    ].filter((c): c is string => !!c);

    const availabilityLicenses = this.customSearchService.isAvailabilityFilterActive()
      ? this.customSearchService.getUserAvailableLicenses()
      : [];

    return {
      fqFilters: this.queryParamsService.getFilters(params),
      customFqClauses: this.customSearchService.getSolrFqFilters(),
      availabilityLicenses,
      userLicenses: this.userService.licenses,
      queryClauses,
      // Grouping (by root.pid) is a pages-scope concept: it only applies when the
      // where-to-search toggle is on `page`. On "all"/titles/etc the lazy pages
      // section is always ungrouped, even if a stale ?group=true lingers in the URL.
      grouped: this.isPageScope(params) && params['group'] === 'true'
    };
  }

  /** Whether the where-to-search selection in ?customSearch is the pages scope. */
  private isPageScope(params: Record<string, string | string[]>): boolean {
    const raw = params['customSearch'];
    const customSearch = Array.isArray(raw) ? raw[0] : raw;
    const entry = customSearch?.split(',')
      .find(k => k.startsWith(customDefinedFacetsEnum.whereToSearchModel + ':'));
    return entry?.split(':')[1] === 'page';
  }

  /** Current URL query params as a plain record (single value or array per key). */
  private urlParams(): Record<string, string | string[]> {
    const urlTree = this.router.parseUrl(this.router.url);
    const params: Record<string, string | string[]> = {};
    urlTree.queryParamMap.keys.forEach(key => {
      const all = urlTree.queryParamMap.getAll(key);
      params[key] = all.length > 1 ? all : all[0];
    });
    return params;
  }
}
