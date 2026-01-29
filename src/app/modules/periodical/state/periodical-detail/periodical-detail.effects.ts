import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, mergeMap, shareReplay, switchMap, tap, withLatestFrom } from 'rxjs/operators';
import { forkJoin, merge, of } from 'rxjs';
import * as PeriodicalDetailActions from './periodical-detail.actions';
import {
  loadPeriodical,
  loadPeriodicalFailure,
  loadPeriodicalItems,
  loadPeriodicalItemsFailure,
  loadPeriodicalItemsSuccess,
  loadPeriodicalSuccess,
} from './periodical-detail.actions';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../../core/solr/solr.service';
import {
  selectAvailableYears,
  selectPeriodicalFacetOperators,
  selectPeriodicalSearchParams,
} from './periodical-detail.selectors';
import { parsePeriodicalItemFromMetadata, PeriodicalItemYear } from '../../../models/periodical-item';
import { DocumentAccessibilityEnum } from '../../../constants/document-accessibility';
import * as DocumentDetailActions from '../../../../shared/state/document-detail/document-detail.actions';
import { loadDocumentDetailSuccess } from '../../../../shared/state/document-detail/document-detail.actions';
import * as PeriodicalSearchActions from '../periodical-search/periodical-search.actions';
import { DocumentTypeEnum } from '../../../constants/document-type';
import { handleFacetsWithOperators } from '../../../../shared/utils/facet-utils';
import { UserService } from '../../../../shared/services/user.service';
import { SolrSortDirections, SolrSortFields } from '../../../../core/solr/solr-helpers';
import { Router } from '@angular/router';
import { APP_ROUTES_ENUM } from '../../../../app.routes';
import {DEFAULT_PERIODICAL_FACET_FIELDS} from '../../../search-results-page/const/facet-fields';
import { CustomSearchService } from '../../../../shared/services/custom-search.service';

@Injectable()
export class PeriodicalDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService,
    private router: Router,
    private customSearchService: CustomSearchService
  ) { }

  triggerDocumentLoad$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodical),
      mergeMap(({ uuid, filters, advancedQuery, page, pageCount, sortBy, sortDirection }) => {
        console.log('triggerDocumentLoad$ - filters:', {
          uuid,
          filters,
          advancedQuery,
          page,
          pageCount,
          sortBy,
          sortDirection
        });

        return [
          DocumentDetailActions.loadDocumentDetail({ uuid }),
          PeriodicalDetailActions.setPeriodicalSearchParams({ filters, advancedQuery, page, pageCount, sortBy, sortDirection })
        ];
      })
    )
  );

  loadPeriodicalFromDocument$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadDocumentDetailSuccess),
      withLatestFrom(
        this.store.select(selectPeriodicalSearchParams),
        this.store.select(selectPeriodicalFacetOperators)
      ),
      switchMap(([{ data }, params, facetOperators]) => {

        const { filters, advancedQuery, page, pageCount, sortBy, sortDirection } = params || {
          filters: [],
          advancedQuery: '',
          page: 1,
          pageCount: 10000,
          sortBy: 'date.min',
          sortDirection: 'asc'
        };

        // Backward compatibility: Handle old /periodical/ URLs that point to monographs
        if (data.model === DocumentTypeEnum.monograph) {
          // Check if this monograph has monograph units (multi-volume monograph)
          return this.solr.getChildrenByModel(data.uuid, 'rels_ext_index.sort asc', null).pipe(
            tap((children) => {
              const hasMonographUnits = children?.some((child: any) => child.model === DocumentTypeEnum.monographunit);

              if (hasMonographUnits) {
                console.log('Backward compatibility: redirecting from /periodical/ to /monograph/ for multi-volume monograph:', data.uuid);
                // Use replaceUrl to replace history entry, preventing back button issues
                this.router.navigate([APP_ROUTES_ENUM.MONOGRAPH_VIEW, data.uuid], { replaceUrl: true });
              }
            }),
            switchMap(() => of(loadPeriodicalFailure({ error: 'Redirecting to monograph view' }))),
            catchError(error => {
              console.error('Error checking monograph children:', error);
              return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
            })
          );
        }

        if (data.model !== DocumentTypeEnum.periodical && data.model !== DocumentTypeEnum.periodicalvolume) {
          return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
        }

        const periodical = parsePeriodicalItemFromMetadata(data);
        const importFacetsFields = import('../../../search-results-page/const/facet-fields').then(m => m.DEFAULT_PERIODICAL_FACET_FIELDS);

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses()
        };

        // Function to load facets independently
        const loadFacets$ = (uuid: string, model: string) => importFacetsFields.then(DEFAULT_PERIODICAL_FACET_FIELDS => {
          return forkJoin({
            facetsRes: this.solr.getPeriodicalChildrenFacets(uuid, model, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter),
            facetsWithoutLicenses: this.solr.getPeriodicalChildrenFacets(uuid, model, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter)
          }).pipe(
            map(({ facetsRes, facetsWithoutLicenses }) => {
              const parsedFacets = handleFacetsWithOperators(
                {},
                facetsRes.facet_counts?.facet_fields ?? {},
                facetOperators,
                facetsWithoutLicenses.facet_counts?.facet_fields ?? {},
                this.userService.licenses,
                facetsRes.response?.numFound,
                filters,
                facetsRes.facet_counts?.facet_queries
              );
              return PeriodicalSearchActions.loadFacetsSuccess({ facets: parsedFacets });
            })
          );
        });


        if (data.model === DocumentTypeEnum.periodical) {

          const volumes$ = this.solr.getPeriodicalVolumes(data.uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery, availabilityFilter).pipe(
            shareReplay(1)
          );

          const processVolumes$ = volumes$.pipe(
            map(volumes => {
              const availableYears = this.mapAvailableYears(volumes);
              const years = this.buildYearList(data, availableYears);

              return loadPeriodicalSuccess({
                document: periodical,
                metadata: data,
                years,
                availableYears,
                facets: {} // Facets will load separately
              });
            }),
            catchError(error => of(loadPeriodicalFailure({ error })))
          );

          const processFacets$ = forkJoin({
            facetsRes: this.solr.getPeriodicalChildrenFacets(data.uuid, DocumentTypeEnum.periodicalvolume, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter),
            facetsWithoutLicenses: this.solr.getPeriodicalChildrenFacets(data.uuid, DocumentTypeEnum.periodicalvolume, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter)
          }).pipe(
            map(({ facetsRes, facetsWithoutLicenses }) => {
              const parsedFacets = handleFacetsWithOperators(
                {},
                facetsRes.facet_counts?.facet_fields ?? {},
                facetOperators,
                facetsWithoutLicenses.facet_counts?.facet_fields ?? {},
                this.userService.licenses,
                facetsRes.response?.numFound,
                filters,
                facetsRes.facet_counts?.facet_queries
              );
              return PeriodicalSearchActions.loadFacetsSuccess({ facets: parsedFacets });
            })
          );
          return merge(processVolumes$, processFacets$);
        }


        if (data.model === DocumentTypeEnum.periodicalvolume) {

          const children$ = this.solr.getPeriodicalItems(data.uuid, filters, page, pageCount, sortBy, sortDirection, advancedQuery, availabilityFilter).pipe(
            shareReplay(1)
          );

          const processChildren$ = children$.pipe(
            withLatestFrom(this.store.select(selectAvailableYears)),
            switchMap(([children, previousAvailableYears]) => {

              children.map(i => {
                if (!i['licenses'] || i['licenses'].length === 0 && i['licenses.facet']) {
                  i['licenses'] = i['licenses.facet'];
                }
              })

              if (previousAvailableYears?.length > 0) {
                return of(loadPeriodicalSuccess({
                  document: periodical,
                  metadata: data,
                  years: [],
                  availableYears: previousAvailableYears,
                  children,
                  facets: {}
                }));
              }

              const rootPid = data.rootPid;
              if (!rootPid) {
                return of(loadPeriodicalFailure({ error: 'Missing rootPid for periodicalvolume' }));
              }

              return this.solr.getPeriodicalVolumes(rootPid).pipe(
                map(volumes => {
                  const availableYears = this.mapAvailableYears(volumes);
                  return loadPeriodicalSuccess({
                    document: periodical,
                    metadata: data,
                    years: [],
                    availableYears,
                    children,
                    facets: {}
                  });
                }),
                catchError(error =>
                  of(loadPeriodicalFailure({ error: 'Failed to load parent periodical volumes: ' + error }))
                )
              );
            }),
            catchError(error => of(loadPeriodicalFailure({ error })))
          );

          const facetsQueryModel = `${DocumentTypeEnum.periodicalitem} OR model:${DocumentTypeEnum.supplement} OR model:${DocumentTypeEnum.page}`;
          const processFacets$ = forkJoin({
            facetsRes: this.solr.getPeriodicalChildrenFacets(data.uuid, facetsQueryModel, filters, DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter),
            facetsWithoutLicenses: this.solr.getPeriodicalChildrenFacets(data.uuid, facetsQueryModel, filters.filter(f => !f.startsWith('license:')), DEFAULT_PERIODICAL_FACET_FIELDS, facetOperators, advancedQuery, availabilityFilter)
          }).pipe(
            map(({ facetsRes, facetsWithoutLicenses }) => {
              const parsedFacets = handleFacetsWithOperators(
                {},
                facetsRes.facet_counts?.facet_fields ?? {},
                facetOperators,
                facetsWithoutLicenses.facet_counts?.facet_fields ?? {},
                this.userService.licenses,
                facetsRes.response?.numFound,
                filters,
                facetsRes.facet_counts?.facet_queries
              );
              return PeriodicalSearchActions.loadFacetsSuccess({ facets: parsedFacets });
            })
          );

          return merge(processChildren$, processFacets$);
        }

        return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
      })
    )
  );

  private mapAvailableYears(volumes: any[]): PeriodicalItemYear[] {
    return volumes
      .filter(v => !!v['date.str'] && !!v['pid'])
      .map(v => {
        const volumeLicenses = v['licenses.facet'] || v['licenses'] || [];
        const userLicenses = this.userService.licenses || [];

        // Determine accessibility: if volume has no licenses OR user has matching license, it's public
        const hasAccess = volumeLicenses.length === 0 ||
          volumeLicenses.some((license: string) => userLicenses.includes(license));

        return {
          year: v['date.str'],
          model: v['model'] || '',
          pid: v['pid'],
          licenses: volumeLicenses,
          exists: true as const,
          accessibility: hasAccess ? DocumentAccessibilityEnum.PUBLIC : DocumentAccessibilityEnum.PRIVATE
        };
      });
  }

  private buildYearList(document: any, availableYears: PeriodicalItemYear[]): PeriodicalItemYear[] {
    const start = parseInt(document['date_range_start.year'], 10);
    const end = parseInt(document['date_range_end.year'], 10);

    return Array.from({ length: end - start + 1 }, (_, i) => {
      const year = (start + i).toString();
      const found = availableYears.find(y => y.year === year);

      return {
        year,
        pid: found?.pid ?? '',
        licenses: found?.['licenses.facet'] ?? [],
        exists: true,
        model: found?.model ?? '',
        accessibility: found?.accessibility ?? DocumentAccessibilityEnum.PRIVATE
      };
    });
  }

  loadPeriodicalItems$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loadPeriodicalItems),
      switchMap(({ parentVolumeUuid }) => {
        console.log('loadPeriodicalItems$ effect - parentVolumeUuid:', parentVolumeUuid);

        return this.solr.getPeriodicalItems(
          parentVolumeUuid,
          [], // no filters for detail view
          0, // page
          1000, // pageCount - get all items
          SolrSortFields.relevance, // sortBy
          SolrSortDirections.asc, // sortDirection
          '' // no advanced query
        ).pipe(
          withLatestFrom(this.store.select(selectAvailableYears)),
          switchMap(([children, previousAvailableYears]) => {
            // Fix licenses field if needed
            children.map(i => {
              if (!i['licenses'] || i['licenses'].length === 0 && i['licenses.facet']) {
                i['licenses'] = i['licenses.facet'];
              }
            });

            console.log('previousAvailableYears:', previousAvailableYears);

            // If we already have availableYears, use them
            if (previousAvailableYears?.length > 0) {
              return of(loadPeriodicalItemsSuccess({
                children,
                availableYears: previousAvailableYears
              }));
            }

            // If no availableYears, we need to load them from the root periodical
            // We'll need to get the rootPid from one of the children
            const firstChild = children[0];
            console.log('First child:', firstChild);
            if (!firstChild['root.pid']) {
              console.warn('No rootPid found in children, cannot load availableYears');
              return of(loadPeriodicalItemsSuccess({
                children,
                availableYears: []
              }));
            }

            // Load volumes to get availableYears
            return this.solr.getPeriodicalVolumes(firstChild['root.pid']).pipe(
              map(volumes => {
                const availableYears = this.mapAvailableYears(volumes);
                return loadPeriodicalItemsSuccess({
                  children,
                  availableYears
                });
              }),
              catchError(error => {
                console.error('Failed to load periodical volumes:', error);
                // Still return success with children, just without availableYears
                return of(loadPeriodicalItemsSuccess({
                  children,
                  availableYears: []
                }));
              })
            );
          }),
          catchError(error => {
            console.error('loadPeriodicalItems$ effect error:', error);
            return of(loadPeriodicalItemsFailure({ error }));
          })
        );
      })
    )
  );

  loadMonthIssues$ = createEffect(() =>
    this.actions$.pipe(
      ofType(PeriodicalDetailActions.loadMonthIssues),
      switchMap(({ parentVolumeUuid, year, month }) => {
        // build date range: [YYYY-MM-01 TO YYYY-MM-lastDay]
        const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

        const fq = [`date.min:[${start.toISOString()} TO ${end.toISOString()}]`];

        return this.solr.getPeriodicalItems(
          parentVolumeUuid,
          fq
        ).pipe(
          map(issues => {
            // Fix licenses field if needed
            issues.map(i => {
              if (!i['licenses'] || i['licenses'].length === 0 && i['licenses.facet']) {
                i['licenses'] = i['licenses.facet'];
              }
            });

            return PeriodicalDetailActions.loadMonthIssuesSuccess({ year, month, issues })
          }),
          catchError(error => of(PeriodicalDetailActions.loadMonthIssuesFailure({ year, month, error })))
        );
      })
    )
  );
}
