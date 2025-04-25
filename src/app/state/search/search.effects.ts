import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { SolrService } from '../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../core/solr/solr-response-parser';
import { parseSearchDocument } from '../../modules/models/search-document';
import {Store } from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import { FacetItem } from '../../modules/models/facet-item';

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
          facetsRes: this.solr.getFacetsWithOrOperator(query, filters, facetFields, facetOperators)
        }).pipe(
          switchMap(({ resultsRes, facetsRes }) => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc =>
              parseSearchDocument(doc)
            );

            const facetsFromSearch = SolrResponseParser.parseAllFacets(resultsRes.facet_counts?.facet_fields ?? {});
            const facetsFromOperator = SolrResponseParser.parseAllFacets(facetsRes.facet_counts?.facet_fields ?? {});

            const mergedFacets: { [key: string]: FacetItem[] } = {};

            for (const [facetKey, operatorValues] of Object.entries(facetsFromOperator)) {
              const searchValues = facetsFromSearch[facetKey] ?? [];
              const operatorMap = new Map(operatorValues.map(item => [item.name, item.count]));
              const merged = [...operatorValues];

              // add missing values
              for (const item of searchValues) {
                if (!operatorMap.has(item.name)) {
                  merged.push(item);
                }
              }

              if (merged.length > 0) {
                mergedFacets[facetKey] = merged;
              }
            }

            return [
              SearchActions.loadSearchResultsSuccess({
                results: parsedResults,
                totalCount: resultsRes.response.numFound
              }),
              SearchActions.loadFacetsSuccess({ facets: mergedFacets })
            ];
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({ error })))
        );
      })
    )
  );

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
