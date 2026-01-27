import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, merge, of } from 'rxjs';
import { SolrService } from '../../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../../core/solr/solr-response-parser';
import { parseSearchDocument } from '../../models/search-document';
import { Store } from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import { DEFAULT_FACET_FIELDS } from '../const/facet-fields';
import {
  customDefinedFacets,
} from '../const/facets';
import { SearchService } from '../../../shared/services/search.service';
import { UserService } from '../../../shared/services/user.service';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
import { AdvancedSearchService } from '../../../shared/services/advanced-search.service';
import { DisplayConfigService } from '../../../shared/services/display-config.service';
import { CustomSearchService } from '../../../shared/services/custom-search.service';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private searchService: SearchService,
    private advancedSearchService: AdvancedSearchService,
    private userService: UserService,
    private displayConfigService: DisplayConfigService,
    private customSearchService: CustomSearchService,
  ) {
  }

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      withLatestFrom(
        this.store.select(SearchSelectors.selectFacets),
        this.store.select(SearchSelectors.selectFacetOperators),
      ),
      switchMap(([{
        query,
        filters,
        filterGroups,
        page,
        pageCount,
        sortBy,
        sortDirection,
        advancedQuery,
        advancedQueryMainOperator,
      }, currentFacets, facetOperators]) => {
        const includePeriodicalItem = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        const includePage = this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses()
        };

        const results$ = this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery, includePeriodicalItem, includePage, this.getRequestedFacets(), filterGroups, availabilityFilter).pipe(
          shareReplay(1)
        );

        const processResults$ = results$.pipe(
          map(resultsRes => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc => {
              // Try to get highlighting by pid first, then check for keys containing "!" (rootPid!pagePid format)
              let highlighting = resultsRes.highlighting?.[doc.pid];
              if (!highlighting || Object.keys(highlighting).length === 0) {
                // Look for highlighting key with format "rootPid!pagePid" where the part after "!" matches doc.pid
                const highlightingKey = Object.keys(resultsRes.highlighting || {}).find(key =>
                  key.includes('!') && key.split('!')[1] === doc.pid
                );
                highlighting = highlightingKey ? resultsRes.highlighting?.[highlightingKey] : {};
              }
              doc['highlighting'] = highlighting || {};
              return parseSearchDocument(doc)
            });

            return SearchActions.loadSearchResultsSuccess({
              results: parsedResults,
              totalCount: resultsRes.response.numFound,
            });
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({ error })))
        );

        const processFacets$ = forkJoin({
          resultsRes: results$,
          facetsRes: this.solr.getFacetsWithOperators(query, filters, this.getRequestedFacets(), facetOperators, advancedQuery, includePeriodicalItem, includePage, null, filterGroups, availabilityFilter),
        }).pipe(
          map(({ resultsRes, facetsRes }) => {
            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              {},
              this.userService.licenses,
              resultsRes.response.numFound,
              filters,
              facetsRes.facet_counts?.facet_queries
            );

            return SearchActions.loadFacetsSuccess({ facets });
          }),
          catchError(error => of(SearchActions.loadFacetsFailure({ error })))
        );

        // Merge both streams so they can emit independently
        return merge(processResults$, processFacets$);
      }),
    ),
  );

  loadFacet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadFacet),
      withLatestFrom(this.store.select(SearchSelectors.selectFacets)),
      switchMap(([{ query, filters, facet, contains, ignoreCase, facetLimit, facetOffset }, currentFacets]) => {

        return this.solr.loadFacet(query, filters, facet, contains, ignoreCase, facetLimit, facetOffset).pipe(
          map(response => {
            const parsed = SolrResponseParser.parseFacet(response.facet_counts.facet_fields?.[facet] || []);
            return SearchActions.loadFacetSuccess({ facet, items: parsed });
          }),
          catchError(error => of(SearchActions.loadFacetFailure({ facet, error }))),
        )
      },
      ),
    ),
  );

  private getRequestedFacets(): string[] {
    const visibleFilters = this.displayConfigService.getVisibleFacetFilters();
    if (!visibleFilters || visibleFilters.length === 0) {
      return DEFAULT_FACET_FIELDS;
    }

    const set = new Set<string>();
    visibleFilters.forEach(f => {
      if (f.isCustomDefined) {
        const custom = customDefinedFacets.find(c => c.facetKey === f.facetKey);
        if (custom && custom.solrFacetKeyForCount) {
          set.add(custom.solrFacetKeyForCount);
        }
      } else {
        set.add(f.facetKey);
      }
    });

    if (set.size === 0) {
      return DEFAULT_FACET_FIELDS;
    }
    return Array.from(set);
  }
}
