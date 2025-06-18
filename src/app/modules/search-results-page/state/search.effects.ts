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
import {FacetItem} from '../../models/facet-item';
import {SolrOperators} from '../../../core/solr/solr-helpers';
import {DEFAULT_FACET_FIELDS} from '../const/facet-fields';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetAccessibilityTypes,
  FacetElementType,
  facetKeysEnum,
} from '../const/facets';
import {SearchService} from '../../../shared/services/search.service';
import {UserService} from '../../../shared/services/user.service';
import {SolrQueryBuilder} from '../../../core/solr/solr-query-builder';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private searchService: SearchService,
    private userService: UserService
  ) {}

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      withLatestFrom(
        this.store.select(SearchSelectors.selectFacets),
        this.store.select(SearchSelectors.selectFacetOperators)
      ),
      switchMap(([{ query, filters, page, pageCount, sortBy, sortDirection, advancedQuery, advancedQueryMainOperator }, currentFacets, facetOperators]) => {

        const includePeriodicalItem = this.searchService.filtersContainDate();
        const includePage = this.searchService.hasSubmittedQuery();

        const baseFilters = SolrQueryBuilder.baseFilters(includePeriodicalItem, includePage);

        return forkJoin({
          resultsRes: this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery, baseFilters),
          facetsRes: this.solr.getFacetsWithOperators(query, filters, DEFAULT_FACET_FIELDS, facetOperators, advancedQuery, baseFilters)
        }).pipe(
          switchMap(({ resultsRes, facetsRes }) => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc =>
              parseSearchDocument(doc)
            );

            // Use special handling for the facets
            const facets = this.handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators
            );

            return [
              SearchActions.loadSearchResultsSuccess({
                results: parsedResults,
                totalCount: resultsRes.response.numFound
              }),
              SearchActions.loadFacetsSuccess({ facets })
            ];
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({ error })))
        );
      })
    )
  );

  private handleFacetsWithOperators(
    searchFacets: Record<string, any[]>,
    operatorFacets: Record<string, any[]>,
    facetOperators: Record<string, SolrOperators>
  ): Record<string, FacetItem[]> {
    const parsedSearchFacets = SolrResponseParser.parseAllFacets(searchFacets);
    const parsedOperatorFacets = SolrResponseParser.parseAllFacets(operatorFacets);

    const result: Record<string, FacetItem[]> = {};

    const allFacetKeys = new Set([
      ...Object.keys(parsedSearchFacets),
      ...Object.keys(parsedOperatorFacets),
    ]);

    for (const facetKey of allFacetKeys) {
      const operator = facetOperators[facetKey] ?? SolrOperators.or;
      const primaryValues = operator === SolrOperators.and
        ? parsedSearchFacets[facetKey] || []
        : parsedOperatorFacets[facetKey] || [];
      const fallbackValues = operator === SolrOperators.and
        ? parsedOperatorFacets[facetKey] || []
        : parsedSearchFacets[facetKey] || [];

      const valueMap = new Map(primaryValues.map(item => [item.name, item]));
      fallbackValues.forEach(item => {
        if (!valueMap.has(item.name)) {
          primaryValues.push(item);
        }
      });

      result[facetKey] = primaryValues;
    }

    // Enrich with custom-defined facets
    for (const custom of customDefinedFacets) {
      console.log('custom', custom);

      const enrichedItems: FacetItem[] = custom.data.map((item: any) => {
        const fqList = Array.isArray(item.fq) ? item.fq : [item.fq];
        console.log('fqList', fqList);
        const baseCount = fqList.reduce((sum: number, fq: any) => {
          return sum + (result[custom.solrFacetKeyForCount]?.find(f => f.name === fq)?.count || 0);
        }, 0);

        console.log('baseCount', baseCount);

        let count = baseCount;

        // Special handling for 'accessibility'
        if (custom.facetKey === customDefinedFacetsEnum.accessibility) {
          const licenses = result[facetKeysEnum.license] || [];
          const models = result[facetKeysEnum.model] || [];
          const userLicenses = this.userService.licenses;

          if (item.key === FacetAccessibilityTypes.all) {
            count = models.reduce((sum, model) => sum + model.count, 0);
          } else if (item.key === FacetAccessibilityTypes.available) {
            item.fq = userLicenses;
            count = userLicenses.reduce((sum, lic) => {
              return sum + (licenses.find(f => f.name === lic)?.count || 0);
            }, 0);
          }
        }

        return {
          ...item,
          count,
          type: item.type ?? FacetElementType.checkbox
        };
      });

      result[custom.title] = enrichedItems;
    }

    return result;
  }

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
          catchError(error => of(SearchActions.loadFacetFailure({ facet, error })))
        )}
      )
    )
  );
}
