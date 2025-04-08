import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { SolrService } from '../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../core/solr/solr-response-parser';
import { parseSearchDocument } from '../../modules/models/search-document';
import { Store } from '@ngrx/store';
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
      withLatestFrom(this.store.select(SearchSelectors.selectFacets)),
      switchMap(([{ query, filters }, currentFacets]) => {
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
          resultsRes: this.solr.search(query, filters),
          facetsRes: this.solr.getFacetsWithOrOperator(query, filters, facetFields)
        }).pipe(
          switchMap(({ resultsRes, facetsRes }) => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc =>
              parseSearchDocument(doc)
            );

            // new facets
            const newFacets = SolrResponseParser.parseAllFacets(facetsRes.facet_counts?.facet_fields ?? {});

            // replace facets completely
            const mergedFacets: { [key: string]: FacetItem[] } = {};
            Object.entries(newFacets).forEach(([key, values]) => {
              if (values.length > 0) {
                mergedFacets[key] = values;
              }
            });

            return [
              SearchActions.loadSearchResultsSuccess({ results: parsedResults }),
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
      switchMap(([{ query, filters, facet }, currentFacets]) =>
        this.solr.loadFacet(query, filters, facet).pipe(
          map(response => {
            const parsed = SolrResponseParser.parseFacet(response.facet_counts.facet_fields?.[facet] || []);
            return SearchActions.loadFacetSuccess({ facet, items: parsed });
          }),
          catchError(error => of(SearchActions.loadFacetFailure({ facet, error })))
        )
      )
    )
  );
}
