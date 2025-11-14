import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {catchError, map, mergeMap, switchMap, withLatestFrom} from 'rxjs/operators';
import {of} from 'rxjs';
import * as PeriodicalDetailActions from './periodical-detail.actions';
import {
  loadPeriodical,
  loadPeriodicalFailure,
  loadPeriodicalItems,
  loadPeriodicalItemsFailure,
  loadPeriodicalItemsSuccess,
  loadPeriodicalSuccess,
} from './periodical-detail.actions';
import {Store} from '@ngrx/store';
import {SolrService} from '../../../../core/solr/solr.service';
import {
  selectAvailableYears,
  selectPeriodicalFacetOperators,
  selectPeriodicalSearchParams,
} from './periodical-detail.selectors';
import {parsePeriodicalItemFromMetadata, PeriodicalItemYear} from '../../../models/periodical-item';
import {DocumentAccessibilityEnum} from '../../../constants/document-accessibility';
import * as DocumentDetailActions from '../../../../shared/state/document-detail/document-detail.actions';
import {loadDocumentDetailSuccess} from '../../../../shared/state/document-detail/document-detail.actions';
import * as PeriodicalSearchActions from '../periodical-search/periodical-search.actions';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {handleFacetsWithOperators} from '../../../../shared/utils/facet-utils';
import {UserService} from '../../../../shared/services/user.service';
import {SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';

@Injectable()
export class PeriodicalDetailEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService
  ) {}

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

        if (data.model !== DocumentTypeEnum.periodical && data.model !== DocumentTypeEnum.periodicalvolume) {
          return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
        }

        const periodical = parsePeriodicalItemFromMetadata(data);

        if (data.model === DocumentTypeEnum.periodical) {
          return this.solr.getPeriodicalVolumesWithFacets(data.uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery).pipe(
            mergeMap(({ volumes, facets, facetsWithoutLicenses }) => {
              const availableYears = this.mapAvailableYears(volumes);
              const years = this.buildYearList(data, availableYears);
              const parsedFacets = handleFacetsWithOperators(
                {},
                facets?.facet_counts?.facet_fields ?? {},
                facetOperators,
                facetsWithoutLicenses.facet_counts?.facet_fields ?? {},
                this.userService.licenses
              );

              const successAction = loadPeriodicalSuccess({
                document: periodical,
                metadata: data,
                years,
                availableYears,
                facets: parsedFacets
              });

              const facetsSuccessAction = PeriodicalSearchActions.loadFacetsSuccess({ facets: parsedFacets });

              // Emit both actions
              return of(successAction, facetsSuccessAction);
            }),
            catchError(error => of(loadPeriodicalFailure({ error })))
          );
        }


        if (data.model === DocumentTypeEnum.periodicalvolume) {
          return this.solr.getPeriodicalItemsWithFacets(data.uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection, advancedQuery).pipe(
            withLatestFrom(this.store.select(selectAvailableYears)),
            switchMap(([{ children, facets, facetsWithoutLicenses }, previousAvailableYears]) => {
              children.map(i => {
                if (!i['licenses'] || i['licenses'].length === 0 && i['licenses.facet']) {
                  i['licenses'] = i['licenses.facet'];
                }
              })

              const parsedFacets = handleFacetsWithOperators(
                {},
                facets?.facet_counts?.facet_fields ?? {},
                facetOperators,
                facetsWithoutLicenses.facet_counts?.facet_fields ?? {},
                this.userService.licenses
              );

              if (previousAvailableYears?.length > 0) {
                return of(
                  loadPeriodicalSuccess({
                  document: periodical,
                  metadata: data,
                  years: [],
                  availableYears: previousAvailableYears,
                  children,
                  facets: parsedFacets
                }),
                  PeriodicalSearchActions.loadFacetsSuccess({facets: parsedFacets}));
              }

              const rootPid = data.rootPid;
              if (!rootPid) {
                return of(loadPeriodicalFailure({ error: 'Missing rootPid for periodicalvolume' }));
              }

              return this.solr.getPeriodicalVolumes(rootPid).pipe(
                mergeMap(volumes => {
                  const availableYears = this.mapAvailableYears(volumes);
                  const successAction = loadPeriodicalSuccess({
                    document: periodical,
                    metadata: data,
                    years: [],
                    availableYears,
                    children,
                    facets: parsedFacets
                  });
                  const facetsSuccessAction = PeriodicalSearchActions.loadFacetsSuccess({ facets: parsedFacets });

                  // Emit both actions
                  return of(successAction, facetsSuccessAction);
                }),
                catchError(error =>
                  of(loadPeriodicalFailure({ error: 'Failed to load parent periodical volumes: ' + error }))
                )
              );
            })
          );
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
        const end   = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

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
