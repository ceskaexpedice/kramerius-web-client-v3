import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, switchMap} from 'rxjs/operators';
import {forkJoin, of } from 'rxjs';
import {SolrService} from '../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import {SolrResponseParser} from '../../core/solr/solr-response-parser';
import {parseSearchDocument} from '../../modules/models/search-document';

@Injectable()
export class SearchEffects {
  constructor(private actions$: Actions, private solr: SolrService) {}

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      switchMap(({ query, filters }) => {
        const activeFacetKeys = filters.map(f => f.split(':')[0]);

        return forkJoin({
          resultsRes: this.solr.search(query, filters),
          facetsRes: this.solr.getFacetsWithout(query, filters, activeFacetKeys)
        }).pipe(
          switchMap(({ resultsRes, facetsRes }) => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc =>
              parseSearchDocument(doc)
            );

            return [
              SearchActions.loadSearchResultsSuccess({ results: parsedResults }),
              SearchActions.loadFacetsSuccess({
                facets: SolrResponseParser.parseAllFacets(facetsRes.facet_counts?.facet_fields ?? {})
              })
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
      switchMap(({ query, filters, facet }) =>
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
