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
import {customDefinedFacets, customDefinedFacetsEnum, facetKeysEnum} from '../const/facets';
import {SearchService} from '../../../shared/services/search.service';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private searchService: SearchService
  ) {}

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      withLatestFrom(
        this.store.select(SearchSelectors.selectFacets),
        this.store.select(SearchSelectors.selectFacetOperators)
      ),
      switchMap(([{ query, filters, page, pageCount, sortBy, sortDirection, advancedQuery, advancedQueryMainOperator }, currentFacets, facetOperators]) => {

        return forkJoin({
          resultsRes: this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery),
          facetsRes: this.solr.getFacetsWithOperators(query, filters, DEFAULT_FACET_FIELDS, facetOperators, advancedQuery)
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

// Helper method to process facets according to their operators
//   private handleFacetsWithOperators(
//     searchFacets: Record<string, any[]>,
//     operatorFacets: Record<string, any[]>,
//     facetOperators: Record<string, SolrOperators>
//   ): Record<string, FacetItem[]> {
//     const parsedSearchFacets = SolrResponseParser.parseAllFacets(searchFacets);
//     const parsedOperatorFacets = SolrResponseParser.parseAllFacets(operatorFacets);
//     const result: Record<string, FacetItem[]> = {};
//
//     // Iterate through all known facet keys (union of keys from both responses)
//     const allFacetKeys = new Set([
//       ...Object.keys(parsedSearchFacets),
//       ...Object.keys(parsedOperatorFacets),
//     ]);
//
//     for (const facetKey of allFacetKeys) {
//       const operator = facetOperators[facetKey] ?? SolrOperators.or;
//
//       const searchValues = parsedSearchFacets[facetKey] || [];
//       const operatorValues = parsedOperatorFacets[facetKey] || [];
//
//       // Use values based on operator
//       let baseValues: FacetItem[];
//
//       if (operator === SolrOperators.and) {
//         baseValues = [...searchValues];
//       } else {
//         baseValues = [...operatorValues];
//       }
//
//       // Create map from base values
//       const valueMap = new Map(baseValues.map(item => [item.name, item]));
//
//       // Add missing values from the other source
//       const additionalValues = operator === SolrOperators.and ? operatorValues : searchValues;
//       for (const item of additionalValues) {
//         if (!valueMap.has(item.name)) {
//           baseValues.push(item);
//         }
//       }
//
//       result[facetKey] = baseValues;
//     }
//
//     for (const custom of customDefinedFacets) {
//       const enrichedItems: FacetItem[] = custom.data.map((item: any) => {
//         console.log('item', item);
//         const fqList = Array.isArray(item.fq) ? item.fq : [item.fq];
//
//         let count = fqList.reduce((sum: number, fqValue: any) => {
//           const value = result[custom.facetKey]?.find(f => f.name === fqValue)?.count || 0;
//           return sum + value;
//         }, 0);
//
//         // if custom.facetKey is customDefinedFacetsEnum.accessibility there are two possible values: 'all' and 'available'
//         // for all count is all documents count, for available count is - we take licenses from searchService, these licenses are available for the user
//         // so we need to sum all documents with available licenses and that is the count for 'available'
//
//         if (custom.facetKey === customDefinedFacetsEnum.accessibility) {
//           const licenses = result[facetKeysEnum.license];
//           const models = result[facetKeysEnum.model];
//           const userLicenses = this.searchService.licenses;
//           let countForAvailable = 0;
//           userLicenses.forEach(l => {
//             const license = licenses.find(f => f.name === l);
//             if (license) {
//               countForAvailable += license.count;
//             }
//           })
//
//           if (item.key === 'all') {
//             models.forEach(m => {
//               count += m.count;
//             })
//
//           } else if (item.key === 'available') {
//             const availableItem = custom.data.find(d => d.key === 'available');
//             if (availableItem) {
//               count = countForAvailable;
//             }
//           }
//
//         }
//
//         return {
//           ...item,
//           count,
//           type: item['type'] ? item['type'] : 'checkbox'
//         };
//       });
//
//       result[custom.title] = enrichedItems;
//     }
//
//     console.log('result', result);
//
//     return result;
//   }

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
      const enrichedItems: FacetItem[] = custom.data.map((item: any) => {
        const fqList = Array.isArray(item.fq) ? item.fq : [item.fq];
        const baseCount = fqList.reduce((sum: number, fq: any) => {
          return sum + (result[custom.facetKey]?.find(f => f.name === fq)?.count || 0);
        }, 0);

        let count = baseCount;

        // Special handling for 'accessibility'
        if (custom.facetKey === customDefinedFacetsEnum.accessibility) {
          const licenses = result[facetKeysEnum.license] || [];
          const models = result[facetKeysEnum.model] || [];
          const userLicenses = this.searchService.licenses;

          if (item.key === 'all') {
            count = models.reduce((sum, model) => sum + model.count, 0);
          } else if (item.key === 'available') {
            item.fq = userLicenses;
            count = userLicenses.reduce((sum, lic) => {
              return sum + (licenses.find(f => f.name === lic)?.count || 0);
            }, 0);
          }
        }

        return {
          ...item,
          count,
          type: item.type ?? 'checkbox'
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
