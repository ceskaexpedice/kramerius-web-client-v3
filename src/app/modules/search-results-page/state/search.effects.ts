import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, merge, of } from 'rxjs';
import { SolrService } from '../../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../../core/solr/solr-response-parser';
import { Store } from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import { DEFAULT_FACET_FIELDS } from '../const/facet-fields';
import {
  getCustomDefinedFacets,
  facetKeysEnum,
  mapOperatorsToSearchFields,
} from '../const/facets';
import { SearchService } from '../../../shared/services/search.service';
import { UserService } from '../../../shared/services/user.service';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
import { AdvancedSearchService } from '../../../shared/services/advanced-search.service';
import { DisplayConfigService } from '../../../shared/services/display-config.service';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { ConfigService } from '../../../core/config/config.service';
import { getTotalCountFromResponse, parseSolrSearchResponse } from './parse-search-results';

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
    private configService: ConfigService,
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
        grouped,
      }, currentFacets, facetOperators]) => {
        const searchFieldOperators = mapOperatorsToSearchFields(facetOperators);
        const includePeriodicalItem = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        // Main results listing must not include pages — pages have their own paginated
        // request (triggerPageSearchAfterMain$). Keeping pages out keeps titlesTotal
        // accurate so the unified paginator spill math works.
        const includePageInResults = false;
        // Facets request, however, should still consider pages so the "page" entry
        // in the model facet (and any page-driven counts) stays correct.
        const includePageInFacets = this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();
        const includeSupplement = this.customSearchService.isSupplementFilterActive() || this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();
        const includeArticle = this.customSearchService.isArticleFilterActive() || this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses(),
          userLicenses: this.userService.licenses
        };

        // Grouping (by root.pid) only makes sense for page docs, which the
        // pages-only effect handles. Titles/articles/attachments are always ungrouped.
        const results$ = this.solr.search(query, filters, searchFieldOperators, page, pageCount, sortBy, sortDirection, advancedQuery, includePeriodicalItem, includePageInResults, this.getRequestedFacets(), filterGroups, availabilityFilter, includeSupplement, includeArticle, false).pipe(
          shareReplay(1)
        );

        const processResults$ = results$.pipe(
          map(resultsRes => {
            const { results, totalCount } = parseSolrSearchResponse(resultsRes, this.searchService.submittedTerm);
            return SearchActions.loadSearchResultsSuccess({ results, totalCount });
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({ error })))
        );

        const processFacets$ = forkJoin({
          resultsRes: results$,
          facetsRes: this.solr.getFacetsWithOperators(query, filters, this.getRequestedFacets(), searchFieldOperators, advancedQuery, includePeriodicalItem, includePageInFacets, null, filterGroups, availabilityFilter, false),
        }).pipe(
          map(({ resultsRes, facetsRes }) => {
            const totalCount = getTotalCountFromResponse(resultsRes);

            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              {},
              this.userService.licenses,
              totalCount,
              filters,
              facetsRes.facet_counts?.facet_queries,
              this.userService.isLoggedIn
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

  /**
   * After the main (titles/articles/attachments) search returns, fire a
   * pages-only search sized to fill the remainder of the current paginator
   * window. Pages spill into the unified paginator after titlesTotal.
   *
   * For main page N with size S: offset = (N-1)*S, titlesTotal from the
   * just-returned response. Solr returned titles for [offset, offset+S);
   * its response length is the titlesShown count for this window. The
   * pages slice we need is start = max(0, offset - titlesTotal),
   * rows = S - titlesShown.
   */
  triggerPageSearchAfterMain$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResultsSuccess),
      withLatestFrom(this.store.select(SearchSelectors.selectLastSearchPayload)),
      map(([{ results, totalCount }, payload]) => {
        if (!payload) {
          return SearchActions.loadPageSearchResultsSuccess({ results: [], totalCount: 0 });
        }
        const titlesShown = results.length;
        const pagesNeeded = Math.max(0, payload.pageCount - titlesShown);
        const offset = payload.page;
        const pagesStart = Math.max(0, offset - totalCount);

        if (pagesNeeded === 0) {
          // Window is full of titles — still fetch totalCount so unified paginator is correct.
          return SearchActions.loadPageSearchResults({
            query: payload.query,
            filters: payload.filters,
            filterGroups: payload.filterGroups,
            advancedQuery: payload.advancedQuery,
            advancedQueryMainOperator: payload.advancedQueryMainOperator,
            page: 0,
            pageCount: 0,
            sortBy: payload.sortBy,
            sortDirection: payload.sortDirection,
            grouped: payload.grouped,
          });
        }

        return SearchActions.loadPageSearchResults({
          query: payload.query,
          filters: payload.filters,
          filterGroups: payload.filterGroups,
          advancedQuery: payload.advancedQuery,
          advancedQueryMainOperator: payload.advancedQueryMainOperator,
          page: pagesStart,
          pageCount: pagesNeeded,
          sortBy: payload.sortBy,
          sortDirection: payload.sortDirection,
          grouped: payload.grouped,
        });
      })
    )
  );

  loadPageSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadPageSearchResults),
      withLatestFrom(this.store.select(SearchSelectors.selectFacetOperators)),
      switchMap(([{
        query,
        filters,
        filterGroups,
        page,
        pageCount,
        sortBy,
        sortDirection,
        advancedQuery,
        grouped,
      }, facetOperators]) => {
        const searchFieldOperators = mapOperatorsToSearchFields(facetOperators);
        const includePeriodicalItem = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        const includePage = true;
        const includeSupplement = false;
        const includeArticle = false;

        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses(),
          userLicenses: this.userService.licenses
        };

        // Constrain to page-level docs: append a separate fq group with model:page.
        const pageOnlyGroup = ['model:page'];
        const effectiveFilterGroups = filterGroups && filterGroups.length > 0
          ? [...filterGroups, pageOnlyGroup]
          : [pageOnlyGroup];

        return this.solr.search(
          query,
          filters,
          searchFieldOperators,
          page,
          pageCount,
          sortBy,
          sortDirection,
          advancedQuery,
          includePeriodicalItem,
          includePage,
          [],
          effectiveFilterGroups,
          availabilityFilter,
          includeSupplement,
          includeArticle,
          !!grouped,
        ).pipe(
          map(resultsRes => {
            const { results, totalCount } = parseSolrSearchResponse(resultsRes, this.searchService.submittedTerm);
            return SearchActions.loadPageSearchResultsSuccess({ results, totalCount });
          }),
          catchError(error => of(SearchActions.loadPageSearchResultsFailure({ error })))
        );
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
      return this.withCdkFacets(DEFAULT_FACET_FIELDS);
    }

    const set = new Set<string>();
    visibleFilters.forEach(f => {
      if (f.isCustomDefined) {
        const custom = getCustomDefinedFacets().find(c => c.facetKey === f.facetKey);
        if (custom && custom.solrFacetKeyForCount) {
          set.add(custom.solrFacetKeyForCount);
        }
      } else {
        set.add(f.facetKey);
      }
    });

    if (set.size === 0) {
      return this.withCdkFacets(DEFAULT_FACET_FIELDS);
    }
    return this.withCdkFacets(Array.from(set));
  }

  private withCdkFacets(fields: string[]): string[] {
    if (!this.configService.isCdk() || fields.includes(facetKeysEnum.cdkCollection)) {
      return fields;
    }
    return [...fields, facetKeysEnum.cdkCollection];
  }
}
