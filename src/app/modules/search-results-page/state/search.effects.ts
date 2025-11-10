import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, switchMap, withLatestFrom} from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import {SolrService} from '../../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import {SolrResponseParser} from '../../../core/solr/solr-response-parser';
import {parseSearchDocument} from '../../models/search-document';
import {Store} from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import {DEFAULT_FACET_FIELDS} from '../const/facet-fields';
import {
  facetKeysEnum,
} from '../const/facets';
import {SearchService} from '../../../shared/services/search.service';
import {UserService} from '../../../shared/services/user.service';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
import {AdvancedSearchService} from '../../../shared/services/advanced-search.service';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private searchService: SearchService,
    private advancedSearchService: AdvancedSearchService,
    private userService: UserService,
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
        page,
        pageCount,
        sortBy,
        sortDirection,
        advancedQuery,
        advancedQueryMainOperator,
      }, currentFacets, facetOperators]) => {
        const includePeriodicalItem = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        const includePage = this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();

        const filtersWithoutLicenses = filters.filter(f => !f.startsWith(`${facetKeysEnum.license}:`));

        return forkJoin({
          resultsRes: this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery, includePeriodicalItem, includePage),
          facetsRes: this.solr.getFacetsWithOperators(query, filters, DEFAULT_FACET_FIELDS, facetOperators, advancedQuery, includePeriodicalItem, includePage),
          facetsAllRes: this.solr.getFacetsWithOperators(query, filtersWithoutLicenses, DEFAULT_FACET_FIELDS, facetOperators, advancedQuery, includePeriodicalItem, includePage),
        }).pipe(
          switchMap(({resultsRes, facetsRes, facetsAllRes}) => {
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
            },
            );

            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              facetsAllRes.facet_counts?.facet_fields ?? {},
              this.userService.licenses,
              resultsRes.response.numFound
            );

            return [
              SearchActions.loadSearchResultsSuccess({
                results: parsedResults,
                totalCount: resultsRes.response.numFound,
              }),
              SearchActions.loadFacetsSuccess({facets}),
            ];
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({error}))),
        );
      }),
    ),
  );

  loadFacet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadFacet),
      withLatestFrom(this.store.select(SearchSelectors.selectFacets)),
      switchMap(([{query, filters, facet, contains, ignoreCase, facetLimit, facetOffset}, currentFacets]) => {

          return this.solr.loadFacet(query, filters, facet, contains, ignoreCase, facetLimit, facetOffset).pipe(
            map(response => {
              const parsed = SolrResponseParser.parseFacet(response.facet_counts.facet_fields?.[facet] || []);
              return SearchActions.loadFacetSuccess({facet, items: parsed});
            }),
            catchError(error => of(SearchActions.loadFacetFailure({facet, error}))),
          )
        },
      ),
    ),
  );
}
