import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { SolrService } from '../../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../../core/solr/solr-response-parser';
import { parseSearchDocument } from '../../models/search-document';
import {Store } from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import { FacetItem } from '../../models/facet-item';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store
  ) {}

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      withLatestFrom(
        this.store.select(SearchSelectors.selectFacets),
        this.store.select(SearchSelectors.selectFacetOperators)
      ),
      switchMap(([{ query, filters, page, pageCount, sortBy, sortDirection }, currentFacets, facetOperators]) => {
        const facetFields = [
          'model',
          'authors.facet',
          'languages.facet',
          'genres.facet',
          'keywords.facet',
          'geographic_names.facet',
          'publishers.facet',
          'publication_places.facet',
          'physical_locations.facet'
        ];

        return forkJoin({
          resultsRes: this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection),
          facetsRes: this.solr.getFacetsWithOperators(query, filters, facetFields, facetOperators)
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
  private handleFacetsWithOperators(
    searchFacets: Record<string, any[]>,
    operatorFacets: Record<string, any[]>,
    facetOperators: Record<string, 'AND' | 'OR'>
  ): Record<string, FacetItem[]> {
    const parsedSearchFacets = SolrResponseParser.parseAllFacets(searchFacets);
    const parsedOperatorFacets = SolrResponseParser.parseAllFacets(operatorFacets);
    const result: Record<string, FacetItem[]> = {};

    // Process each facet field
    for (const [facetKey, values] of Object.entries(parsedOperatorFacets)) {
      const operator = facetOperators[facetKey] ?? 'OR';

      if (operator === 'OR') {
        // For OR, use the values from operatorFacets (with tag/exclude)
        result[facetKey] = values;
      } else {
        // For AND, use the values from searchFacets (without tag/exclude)
        result[facetKey] = parsedSearchFacets[facetKey] || [];
      }

      // Make sure we don't miss any values that might only be in one response
      if (operator === 'AND' && values.length > 0) {
        const existingMap = new Map(result[facetKey].map(item => [item.name, item]));

        // Add any missing values from operatorFacets
        for (const item of values) {
          if (!existingMap.has(item.name)) {
            result[facetKey].push(item);
          }
        }
      }
    }

    return result;
  }

  loadFacet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadFacet),
      withLatestFrom(this.store.select(SearchSelectors.selectFacets)),
      switchMap(([{ query, filters, facet, contains, ignoreCase, facetLimit, facetOffset }, currentFacets]) => {
        console.log('ide sem')
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
