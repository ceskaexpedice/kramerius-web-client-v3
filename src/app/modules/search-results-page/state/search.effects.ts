import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, shareReplay, switchMap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, merge, of } from 'rxjs';
import { SolrService } from '../../../core/solr/solr.service';
import * as SearchActions from './search.actions';
import { SolrResponseParser } from '../../../core/solr/solr-response-parser';
import { parseSearchDocument } from '../../models/search-document';
import { Store } from '@ngrx/store';
import * as SearchSelectors from './search.selectors';
import { DEFAULT_FACET_FIELDS } from '../const/facet-fields';
import {
  getCustomDefinedFacets,
  facetKeysEnum,
  mapOperatorsToSearchFields,
} from '../const/facets';
import { SearchService } from '../../../shared/services/search.service';
import { UserService } from '../../../shared/services/user.service';
import { handleFacetsWithOperators } from '../../../shared/utils/facet-utils';
import { AdvancedSearchService } from '../../../shared/services/advanced-search.service';
import { DisplayConfigService } from '../../../shared/services/display-config.service';
import { CustomSearchService } from '../../../shared/services/custom-search.service';
import { ConfigService } from '../../../core/config/config.service';
import { DocumentTypeEnum } from '../../constants/document-type';

@Injectable()
export class SearchEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private searchService: SearchService,
    private advancedSearchService: AdvancedSearchService,
    private userService: UserService,
    private displayConfigService: DisplayConfigService,
    private customSearchService: CustomSearchService,
    private configService: ConfigService,
  ) {
  }

  loadSearchResults$ = createEffect(() =>
    this.actions$.pipe(
      ofType(SearchActions.loadSearchResults),
      withLatestFrom(
        this.store.select(SearchSelectors.selectFacets),
        this.store.select(SearchSelectors.selectFacetOperators),
      ),
      switchMap(([{
        query,
        filters,
        filterGroups,
        page,
        pageCount,
        sortBy,
        sortDirection,
        advancedQuery,
        advancedQueryMainOperator,
        grouped,
      }, currentFacets, facetOperators]) => {
        const searchFieldOperators = mapOperatorsToSearchFields(facetOperators);
        const includePeriodicalItem = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        const includePage = this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();
        const includeSupplement = this.customSearchService.isSupplementFilterActive() || this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();
        const includeArticle = this.customSearchService.isArticleFilterActive() || this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses(),
          userLicenses: this.userService.licenses
        };

        const results$ = this.solr.search(query, filters, searchFieldOperators, page, pageCount, sortBy, sortDirection, advancedQuery, includePeriodicalItem, includePage, this.getRequestedFacets(), filterGroups, availabilityFilter, includeSupplement, includeArticle, !!grouped).pipe(
          shareReplay(1)
        );

        const processResults$ = results$.pipe(
          map(resultsRes => {
            const groupedField = resultsRes.grouped?.['root.pid'];
            const submittedTerm = this.searchService.submittedTerm;

            if (groupedField) {
              const buildParsed = (doc: any): any => {
                let highlighting = resultsRes.highlighting?.[doc.pid];
                if (!highlighting || Object.keys(highlighting).length === 0) {
                  const highlightingKey = Object.keys(resultsRes.highlighting || {}).find(key =>
                    key.includes('!') && key.split('!')[1] === doc.pid
                  );
                  highlighting = highlightingKey ? resultsRes.highlighting?.[highlightingKey] : {};
                }
                doc['highlighting'] = highlighting || {};
                const parsed: any = parseSearchDocument(doc);
                if (submittedTerm && submittedTerm.trim().length > 0) {
                  parsed.fulltext = submittedTerm;
                }
                return parsed;
              };

              const isPageDoc = (d: any): boolean =>
                d.model === DocumentTypeEnum.page
                || (typeof d.own_model_path === 'string' && d.own_model_path.includes(DocumentTypeEnum.page));

              const parsedResults = (groupedField.groups ?? []).flatMap(group => {
                const docs = group.doclist?.docs ?? [];
                if (docs.length === 0) return [];
                const numFound = group.doclist?.numFound ?? 0;
                const rootPid = group.groupValue;
                const out: any[] = [];

                // Page-level grouped representative: project onto root and attach occurrence count.
                const pageDoc = docs.find(isPageDoc);
                if (pageDoc) {
                  const parsed = buildParsed(pageDoc);
                  parsed.occurrenceCount = numFound;
                  if (parsed.rootPid && parsed.rootModel) {
                    parsed.pid = parsed.rootPid;
                    parsed.title = parsed.rootTitle || parsed.title;
                    parsed.model = parsed.rootModel;
                    parsed.ownParentPid = undefined;
                    parsed.ownParentModel = undefined;
                  }
                  out.push(parsed);
                }

                // Direct title hit (the root document itself matched on metadata):
                // emit as a separate result without count and without root-projection.
                const directHit = docs.find((d: any) =>
                  !isPageDoc(d) && d.pid === rootPid
                );
                if (directHit) {
                  out.push(buildParsed(directHit));
                }

                return out;
              });

              return SearchActions.loadSearchResultsSuccess({
                results: parsedResults,
                totalCount: groupedField.ngroups ?? parsedResults.length,
              });
            }

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
              return parseSearchDocument(doc)
            });

            return SearchActions.loadSearchResultsSuccess({
              results: parsedResults,
              totalCount: resultsRes.response.numFound,
            });
          }),
          catchError(error => of(SearchActions.loadSearchResultsFailure({ error })))
        );

        const processFacets$ = forkJoin({
          resultsRes: results$,
          facetsRes: this.solr.getFacetsWithOperators(query, filters, this.getRequestedFacets(), searchFieldOperators, advancedQuery, includePeriodicalItem, includePage, null, filterGroups, availabilityFilter, !!grouped),
        }).pipe(
          map(({ resultsRes, facetsRes }) => {
            const groupedField = resultsRes.grouped?.['root.pid'];
            const totalCount = groupedField
              ? (groupedField.ngroups ?? 0)
              : (resultsRes.response?.numFound ?? 0);

            const facets = handleFacetsWithOperators(
              resultsRes.facet_counts?.facet_fields ?? {},
              facetsRes.facet_counts?.facet_fields ?? {},
              facetOperators,
              {},
              this.userService.licenses,
              totalCount,
              filters,
              facetsRes.facet_counts?.facet_queries,
              this.userService.isLoggedIn
            );

            return SearchActions.loadFacetsSuccess({ facets });
          }),
          catchError(error => of(SearchActions.loadFacetsFailure({ error })))
        );

        // Merge both streams so they can emit independently
        return merge(processResults$, processFacets$);
      }),
    ),
  );

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
          catchError(error => of(SearchActions.loadFacetFailure({ facet, error }))),
        )
      },
      ),
    ),
  );

  private getRequestedFacets(): string[] {
    const visibleFilters = this.displayConfigService.getVisibleFacetFilters();
    if (!visibleFilters || visibleFilters.length === 0) {
      return this.withCdkFacets(DEFAULT_FACET_FIELDS);
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
      return this.withCdkFacets(DEFAULT_FACET_FIELDS);
    }
    return this.withCdkFacets(Array.from(set));
  }

  private withCdkFacets(fields: string[]): string[] {
    if (!this.configService.isCdk() || fields.includes(facetKeysEnum.cdkCollection)) {
      return fields;
    }
    return [...fields, facetKeysEnum.cdkCollection];
  }
}
