import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, switchMap, withLatestFrom } from 'rxjs/operators';
import {forkJoin, of} from 'rxjs';
import {
  loadFacetsSuccess, loadPeriodicalSearchFailure,
  loadPeriodicalSearchResults, loadPeriodicalSearchSuccess,
} from './periodical-search.actions';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../../core/solr/solr.service';
import * as PeriodicalSelectors from './periodical-search.selectors';
import {DEFAULT_PERIODICAL_FACET_FIELDS} from '../../../search-results-page/const/facet-fields';
import {parseSearchDocument} from '../../../models/search-document';
import {handleFacetsWithOperators} from '../../../../shared/utils/facet-utils';
import {UserService} from '../../../../shared/services/user.service';
import {DocumentTypeEnum} from '../../../constants/document-type';

@Injectable()
export class PeriodicalSearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService
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
          resultsRes: this.solr.searchPeriodicals(uuid, query, filters, facetOperators, page, pageCount, sortBy, sortDirection, undefined, true, true),
          facetsRes: this.solr.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.page, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators),
          facetsWithoutLicensesRes: this.solr.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.page, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators),
        }).pipe(
          switchMap(({resultsRes, facetsRes, facetsWithoutLicensesRes}) => {

            const parsedResults = (resultsRes.response?.docs ?? []).map(doc => {
                doc['highlighting'] = resultsRes.highlighting?.[doc.pid] || {};
                return parseSearchDocument(doc)
              },
            );

            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              facetsWithoutLicensesRes.facet_counts?.facet_fields ?? {},
              this.userService.licenses
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

}
