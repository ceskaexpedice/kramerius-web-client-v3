import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, shareReplay, switchMap, withLatestFrom} from 'rxjs/operators';
import {forkJoin, map, merge, of} from 'rxjs';
import {
  loadFacetsSuccess, loadPeriodicalSearchFailure,
  loadPeriodicalSearchResults, loadPeriodicalSearchSuccess,
} from './periodical-search.actions';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../../core/solr/solr.service';
import * as PeriodicalSelectors from './periodical-search.selectors';
import { DEFAULT_PERIODICAL_FACET_FIELDS } from '../../../search-results-page/const/facet-fields';
import { parseSearchDocument } from '../../../models/search-document';
import { handleFacetsWithOperators } from '../../../../shared/utils/facet-utils';
import { UserService } from '../../../../shared/services/user.service';
import { DocumentTypeEnum } from '../../../constants/document-type';
import { CustomSearchService } from '../../../../shared/services/custom-search.service';

@Injectable()
export class PeriodicalSearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService,
    private customSearchService: CustomSearchService
  ) { }

  loadPeriodicalSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodicalSearchResults),
      withLatestFrom(
        this.store.select(PeriodicalSelectors.selectPeriodicalSearchStateFacets),
        this.store.select(PeriodicalSelectors.selectFacetOperators)
      ),
      switchMap(([{ uuid, query, filters, advancedQuery, page, pageCount, sortBy, sortDirection }, currentFacets, facetOperators]) => {

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses()
        };

        const results$ = this.solr.searchPeriodicals(uuid, query, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery, true, true, false, availabilityFilter).pipe(
          shareReplay(1)
        );

        const processResults$ = results$.pipe(
          map(resultsRes => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc => {
              doc['highlighting'] = resultsRes.highlighting?.[doc.pid] || {};
              return parseSearchDocument(doc)
            });

            return loadPeriodicalSearchSuccess({
              results: parsedResults,
              totalCount: resultsRes.response.numFound
            });
          }),
          catchError(error => of(loadPeriodicalSearchFailure({ error })))
        );

        const processFacets$ = forkJoin({
          resultsRes: results$, // wait for results to get numFound or consistency
          facetsRes: this.solr.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.page, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, undefined, availabilityFilter),
          facetsWithoutLicensesRes: this.solr.getPeriodicalChildrenFacets(uuid, DocumentTypeEnum.page, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, undefined, availabilityFilter),
        }).pipe(
          map(({ resultsRes, facetsRes, facetsWithoutLicensesRes }) => {
            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              facetsWithoutLicensesRes.facet_counts?.facet_fields ?? {},
              this.userService.licenses,
              resultsRes.response.numFound,
              filters,
              facetsRes.facet_counts?.facet_queries
            );

            return loadFacetsSuccess({ facets });
          }),
          catchError(error => of(loadFacetsSuccess({ facets: {} })))
        );

        return merge(processResults$, processFacets$);
      })
    )
  )

}
