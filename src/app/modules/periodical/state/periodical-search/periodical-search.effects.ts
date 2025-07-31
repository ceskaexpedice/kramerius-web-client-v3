import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import {
  loadFacetsSuccess, loadPeriodicalSearchFailure,
  loadPeriodicalSearchResults, loadPeriodicalSearchSuccess,
} from './periodical-search.actions';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../../core/solr/solr.service';
import * as PeriodicalSelectors from './periodical-search.selectors';
import {DEFAULT_FACET_FIELDS} from '../../../search-results-page/const/facet-fields';
import {parseSearchDocument} from '../../../models/search-document';
import {SolrOperators} from '../../../../core/solr/solr-helpers';
import {FacetItem} from '../../../models/facet-item';
import {SolrResponseParser} from '../../../../core/solr/solr-response-parser';

@Injectable()
export class PeriodicalSearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store
  ) {}

  loadPeriodicalSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodicalSearchResults),
      withLatestFrom(
        this.store.select(PeriodicalSelectors.selectPeriodicalSearchStateFacets),
        this.store.select(PeriodicalSelectors.selectFacetOperators)
      ),
      switchMap(([{ uuid, query, filters, page, pageCount, sortBy, sortDirection }, currentFacets, facetOperators]) => {


        return forkJoin({
          resultsRes: this.solr.search(query, filters, facetOperators, page, pageCount, sortBy, sortDirection, undefined, true, true),
          facetsRes: this.solr.getFacetsWithOperators(query, filters, DEFAULT_FACET_FIELDS, facetOperators, undefined, true, true),
        }).pipe(
          switchMap(({resultsRes, facetsRes}) => {

            const parsedResults = (resultsRes.response?.docs ?? []).map(doc => {
                doc['highlighting'] = resultsRes.highlighting?.[doc.pid] || {};
                return parseSearchDocument(doc)
              },
            );

            const facets = this.handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
            );

            return [
              loadPeriodicalSearchSuccess({
                results: parsedResults,
                totalCount: resultsRes.response.numFound
              }),
              loadFacetsSuccess({
                facets
              })
            ]
          }),
          catchError(error => of(loadPeriodicalSearchFailure({ error })))
        )
      })
    )
  )

  private handleFacetsWithOperators(
    searchFacets: Record<string, any[]>,
    operatorFacets: Record<string, any[]>,
    facetOperators: Record<string, SolrOperators>,
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

    return result;
  }

}
