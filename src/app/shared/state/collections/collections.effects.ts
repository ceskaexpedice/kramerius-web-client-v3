import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../core/solr/solr.service';
import {
  loadCollectionSearchResults,
  loadCollectionSearchResultsSuccess,
  loadCollectionFacetsSuccess,
  loadCollectionSearchResultsFailure,
  loadCollectionFacet,
  loadCollectionFacetSuccess,
  loadCollectionDetail,
  loadCollectionDetailSuccess,
  loadCollectionDetailFailure,
} from './collections.actions';
import { parseSearchDocument } from '../../../modules/models/search-document';
import {
  selectCollectionFacets,
  selectCollectionFacetOperators
} from './collections.selectors';
import { DEFAULT_FACET_FIELDS } from '../../../modules/search-results-page/const/facet-fields';
import { facetKeysEnum } from '../../../modules/search-results-page/const/facets';
import { UserService } from '../../services/user.service';
import { handleFacetsWithOperators } from '../../utils/facet-utils';
import { AppTranslationService } from '../../translation/app-translation.service';
import { fromSolrToMetadata } from '../../models/metadata.model';

@Injectable()
export class CollectionsEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService,
    private translationService: AppTranslationService
  ) {}

  loadCollectionSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionSearchResults),
      withLatestFrom(
        this.store.select(selectCollectionFacets),
        this.store.select(selectCollectionFacetOperators)
      ),
      switchMap(([{
        uuid,
        query,
        filters,
        page,
        pageCount,
        sortBy,
        sortDirection,
        advancedQuery,
        advancedQueryMainOperator
      }, currentFacets, facetOperators]) => {
        const includePeriodicalItem = filters.some(f => f.toLowerCase().includes('date'));
        const includePage = query && query.trim().length > 0;

        const filtersWithoutLicenses = filters.filter(f => !f.startsWith(`${facetKeysEnum.license}:`));

        return forkJoin({
          resultsRes: this.solr.searchInCollection(
            uuid,
            query,
            filters,
            facetOperators,
            page,
            pageCount,
            sortBy,
            sortDirection,
            advancedQuery,
            includePeriodicalItem,
            includePage || false
          ),
          facetsRes: this.solr.getFacetsInCollection(
            uuid,
            query,
            filters,
            DEFAULT_FACET_FIELDS,
            facetOperators,
            advancedQuery,
            includePeriodicalItem,
            includePage || false
          ),
          facetsAllRes: this.solr.getFacetsInCollection(
            uuid,
            query,
            filtersWithoutLicenses,
            DEFAULT_FACET_FIELDS,
            facetOperators,
            advancedQuery,
            includePeriodicalItem,
            includePage || false
          )
        }).pipe(
          switchMap(({ resultsRes, facetsRes, facetsAllRes }) => {
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
              return parseSearchDocument(doc);
            });

            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              facetsAllRes.facet_counts?.facet_fields ?? {},
              this.userService.licenses
            );

            return [
              loadCollectionSearchResultsSuccess({
                results: parsedResults,
                totalCount: resultsRes.response.numFound
              }),
              loadCollectionFacetsSuccess({ facets })
            ];
          }),
          catchError(error => of(loadCollectionSearchResultsFailure({ error })))
        );
      })
    )
  );

  loadCollectionDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionDetail),
      switchMap(({ uuid }) => {
        const currentLang = this.translationService.currentLanguage().code;
        return this.solr.getDetailItem(uuid).pipe(
          map(detail => {
            const metadata = fromSolrToMetadata(detail, currentLang);
            return loadCollectionDetailSuccess({ detail: metadata });
          }),
          catchError(error => {
            console.error('Error loading collection detail:', error);
            return of(loadCollectionDetailFailure({ error }));
          })
        );
      })
    )
  );

  loadCollectionFacet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionFacet),
      withLatestFrom(this.store.select(selectCollectionFacets)),
      switchMap(([{ uuid, query, filters, facet, contains, ignoreCase, facetLimit, facetOffset }, currentFacets]) => {
        // TODO: Implement loadFacet for collections if needed
        // For now, return empty array
        return of(loadCollectionFacetSuccess({ facet, items: [] }));
      })
    )
  );
}
