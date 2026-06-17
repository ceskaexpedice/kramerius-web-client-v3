import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { QueryParamsService } from '../../../core/services/QueryParamsManager';
import { UserService } from '../../../shared/services/user.service';
import { buildYearRangeQuery, buildDateMinRangeQuery } from '../../../shared/utils/date-range-query';
import { FolderSearchFilters } from './folders.service';

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
      queryClauses
    };
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
