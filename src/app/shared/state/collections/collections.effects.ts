import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, merge, of } from 'rxjs';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../core/solr/solr.service';
import {
  loadAllCollections,
  loadAllCollectionsFailure,
  loadAllCollectionsSuccess,
  loadCollectionDetail,
  loadCollectionDetailFailure,
  loadCollectionDetailSuccess,
  loadCollectionFacet,
  loadCollectionFacetsSuccess,
  loadCollectionFacetSuccess,
  loadCollectionSearchResults,
  loadCollectionSearchResultsFailure,
  loadCollectionSearchResultsSuccess,
} from './collections.actions';
import { parseSearchDocument } from '../../../modules/models/search-document';
import { selectCollectionFacetOperators, selectCollectionFacets } from './collections.selectors';
import { DEFAULT_FACET_FIELDS } from '../../../modules/search-results-page/const/facet-fields';
import {
  facetKeysEnum,
  getCustomDefinedFacets,
} from '../../../modules/search-results-page/const/facets';
import { UserService } from '../../services/user.service';
import { handleFacetsWithOperators } from '../../utils/facet-utils';
import { AppTranslationService } from '../../translation/app-translation.service';
import { fromSolrToMetadata, mergeMetadata } from '../../models/metadata.model';
import { ModsParserService } from '../../services/mods-parser.service';
import { SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';
import { DisplayConfigService } from '../../services/display-config.service';
import { CustomSearchService } from '../../services/custom-search.service';

@Injectable()
export class CollectionsEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService,
    private translationService: AppTranslationService,
    private modsParserService: ModsParserService,
    private displayConfigService: DisplayConfigService,
    private customSearchService: CustomSearchService,
  ) {
  }

  loadCollectionSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionSearchResults),
      withLatestFrom(
        this.store.select(selectCollectionFacets),
        this.store.select(selectCollectionFacetOperators),
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
        advancedQueryMainOperator,
        includePeriodicalItem,
        includePage,
      }, currentFacets, facetOperators]) => {

        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses(),
          userLicenses: this.userService.licenses
        };

        const filtersWithoutLicenses = filters.filter(f => !f.startsWith(`${facetKeysEnum.license}:`));

        const results$ = this.solr.searchInCollection(
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
          includePage || false,
          this.getRequestedFacets(),
          availabilityFilter,
        ).pipe(
          map(resultsRes => {
            const parsedResults = (resultsRes.response?.docs ?? []).map(doc => {
              // Try to get highlighting by pid first, then check for keys containing "!" (rootPid!pagePid format)
              let highlighting = resultsRes.highlighting?.[doc.pid];
              if (!highlighting || Object.keys(highlighting).length === 0) {
                // Look for highlighting key with format "rootPid!pagePid" where the part after "!" matches doc.pid
                const highlightingKey = Object.keys(resultsRes.highlighting || {}).find(key =>
                  key.includes('!') && key.split('!')[1] === doc.pid,
                );
                highlighting = highlightingKey ? resultsRes.highlighting?.[highlightingKey] : {};
              }
              doc['highlighting'] = highlighting || {};
              return parseSearchDocument(doc);
            });

            return loadCollectionSearchResultsSuccess({
              results: parsedResults,
              totalCount: resultsRes.response.numFound,
            });
          }),
          catchError(error => of(loadCollectionSearchResultsFailure({ error })))
        );

        const facets$ = forkJoin({
          facetsRes: this.solr.getFacetsInCollection(
            uuid,
            query,
            filters,
            this.getRequestedFacets(),
            facetOperators,
            advancedQuery,
            includePeriodicalItem,
            includePage || false,
            availabilityFilter,
          ),
          facetsAllRes: this.solr.getFacetsInCollection(
            uuid,
            query,
            filtersWithoutLicenses,
            this.getRequestedFacets(),
            facetOperators,
            advancedQuery,
            includePeriodicalItem,
            includePage || false,
            availabilityFilter,
          ),
        }).pipe(
          map(({ facetsRes, facetsAllRes }) => {
            const facets = handleFacetsWithOperators(
              {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              facetsAllRes.facet_counts?.facet_fields ?? {},
              this.userService.licenses,
              facetsRes.response?.numFound,
              filters,
              facetsRes.facet_counts?.facet_queries,
              this.userService.isLoggedIn
            );
            return loadCollectionFacetsSuccess({ facets });
          })
        );

        return merge(results$, facets$);
      }),
    ),
  );

  loadCollectionDetail$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionDetail),
      switchMap(({ uuid }) => {
        const currentLang = this.translationService.currentLanguage().code;

        return forkJoin({
          solrDetail: this.solr.getDetailItem(uuid),
          modsMetadata: this.modsParserService.getMods(uuid).catch(err => {
            console.warn('Failed to load MODS data, continuing with Solr data only:', err);
            return null;
          }),
        }).pipe(
          map(({ solrDetail, modsMetadata }) => {
            // Convert Solr data to metadata
            let metadata = fromSolrToMetadata(solrDetail, currentLang);

            // Merge MODS data if available
            if (modsMetadata) {
              metadata = mergeMetadata(metadata, modsMetadata);
            }

            return loadCollectionDetailSuccess({ detail: metadata });
          }),
          catchError(error => {
            console.error('Error loading collection detail:', error);
            return of(loadCollectionDetailFailure({ error }));
          }),
        );
      }),
    ),
  );

  loadCollectionFacet$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadCollectionFacet),
      withLatestFrom(this.store.select(selectCollectionFacets)),
      switchMap(([{ uuid, query, filters, facet, contains, ignoreCase, facetLimit, facetOffset }, currentFacets]) => {
        return of(loadCollectionFacetSuccess({ facet, items: [] }));
      }),
    ),
  );

  loadAllCollections$ = createEffect(() => {
    console.log('Load Collections');
    return this.actions$.pipe(
      ofType(loadAllCollections),
      switchMap(() => {
        // Query Solr for all collections
        // Using the search method with model:collection filter
        return this.solr.search(
          '*',
          ['model:collection'],
          {},
          0,
          1000,
          SolrSortFields.relevance,
          SolrSortDirections.desc,
          '',
          false,
          false,
        ).pipe(
          map(response => {
            const collections = response.response?.docs || [];
            const totalCount = response.response?.numFound || collections.length;
            console.log(`Loaded ${collections.length} collections via NgRx`);

            const parsedResults = (response.response?.docs ?? []).map(doc => {
              return parseSearchDocument(doc);
            });

            return loadAllCollectionsSuccess({ collections: parsedResults, totalCount });
          }),
          catchError(error => {
            console.error('Error loading all collections:', error);
            return of(loadAllCollectionsFailure({ error }));
          }),
        );
      }),
    )
  },
  );

  private getRequestedFacets(): string[] {
    const visibleFilters = this.displayConfigService.getVisibleFacetFilters();
    if (!visibleFilters || visibleFilters.length === 0) {
      return DEFAULT_FACET_FIELDS;
    }

    const set = new Set<string>();
    visibleFilters.forEach(f => {
      if (f.isCustomDefined) {
        const custom = getCustomDefinedFacets().find(c => c.facetKey === f.facetKey);
        if (custom && custom.solrFacetKeyForCount) {
          set.add(custom.solrFacetKeyForCount);
        }
      } else {
        set.add(f.facetKey);
      }
    });

    if (set.size === 0) {
      return DEFAULT_FACET_FIELDS;
    }
    return Array.from(set);
  }
}
