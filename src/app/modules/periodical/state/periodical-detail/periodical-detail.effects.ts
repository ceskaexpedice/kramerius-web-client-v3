// import { Injectable } from '@angular/core';
// import { Actions, createEffect, ofType } from '@ngrx/effects';
// import { catchError, map, switchMap, withLatestFrom } from 'rxjs/operators';
// import { of } from 'rxjs';
// import {
//   loadPeriodical,
//   loadPeriodicalFailure,
//   loadPeriodicalSuccess
// } from './periodical-detail.actions';
// import { SolrService } from '../../../core/solr/solr.service';
// import { selectAvailableYears } from './periodical-detail.selectors';
// import { Store } from '@ngrx/store';
// import {PeriodicalItemYear} from '../../models/periodical-item';
// import {DocumentAccessibilityEnum} from '../../constants/document-accessibility';
//
// @Injectable()
// export class PeriodicalDetailEffects {
//   constructor(
//     private actions$: Actions,
//     private solr: SolrService,
//     private store: Store
//   ) {}
//
//   loadPeriodical$ = createEffect(() =>
//     this.actions$.pipe(
//       ofType(loadPeriodical),
//       switchMap(({ uuid }) =>
//         this.solr.getDetailItem(uuid).pipe(
//           switchMap(document => {
//             console.log('document', document);
//             if (document.model === 'periodical') {
//               return this.solr.getPeriodicalVolumes(uuid).pipe(
//                 map(volumes => {
//                   const availableYears = this.mapAvailableYears(volumes);
//                   const years = this.buildYearList(document, availableYears);
//                   return loadPeriodicalSuccess({ document, years, availableYears });
//                 })
//               );
//             }
//
//             if (document.model === 'periodicalvolume') {
//               return this.solr.getPeriodicalItems(uuid).pipe(
//                 withLatestFrom(this.store.select(selectAvailableYears)),
//                 switchMap(([children, previousAvailableYears]) => {
//                   if (previousAvailableYears && previousAvailableYears.length > 0) {
//                     return of(loadPeriodicalSuccess({
//                       document,
//                       years: [],
//                       availableYears: previousAvailableYears,
//                       children
//                     }));
//                   }
//
//                   const rootPid = document['root.pid'];
//                   if (!rootPid) {
//                     return of(loadPeriodicalFailure({ error: 'Missing root.pid for periodicalvolume' }));
//                   }
//
//                   return this.solr.getPeriodicalVolumes(rootPid).pipe(
//                     map(volumes => {
//                       const availableYears = this.mapAvailableYears(volumes);
//                       return loadPeriodicalSuccess({
//                         document,
//                         years: [],
//                         availableYears,
//                         children
//                       });
//                     }),
//                     catchError(error =>
//                       of(loadPeriodicalFailure({ error: 'Failed to load parent periodical volumes: ' + error }))
//                     )
//                   );
//                 })
//               );
//             }
//
//             return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
//           }),
//           catchError(error => of(loadPeriodicalFailure({ error })))
//         )
//       )
//     )
//   );
//
//   private mapAvailableYears(volumes: any[]): PeriodicalItemYear[] {
//     return volumes
//       .filter(v => !!v['date.str'] && !!v['pid'] && !!v['accessibility'])
//       .map(v => ({
//         year: v['date.str'],
//         pid: v['pid'],
//         exists: true as const,
//         accessibility: v['accessibility'] as DocumentAccessibilityEnum
//       }));
//   }
//
//   private buildYearList(document: any, availableYears: PeriodicalItemYear[]): PeriodicalItemYear[] {
//     const start = parseInt(document['date_range_start.year'], 10);
//     const end = parseInt(document['date_range_end.year'], 10);
//
//     return Array.from({ length: end - start + 1 }, (_, i) => {
//       const year = (start + i).toString();
//       const found = availableYears.find(y => y.year === year);
//
//       return {
//         year,
//         pid: found?.pid ?? '',
//         exists: true,
//         accessibility: found?.accessibility ?? DocumentAccessibilityEnum.PRIVATE
//       };
//     });
//   }
// }

import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import {catchError, map, mergeMap, switchMap, withLatestFrom} from 'rxjs/operators';
import { of } from 'rxjs';
import {
  loadPeriodical,
  loadPeriodicalFailure,
  loadPeriodicalSuccess,
} from './periodical-detail.actions';
import { Store } from '@ngrx/store';
import { SolrService } from '../../../../core/solr/solr.service';
import {
  selectAvailableYears,
  selectPeriodicalFacetOperators,
  selectPeriodicalSearchParams,
} from './periodical-detail.selectors';
import {parsePeriodicalItemFromMetadata, PeriodicalItemYear} from '../../../models/periodical-item';
import { DocumentAccessibilityEnum } from '../../../constants/document-accessibility';
import * as DocumentDetailActions from '../../../../shared/state/document-detail/document-detail.actions';
import * as PeriodicalDetailActions from './periodical-detail.actions';
import * as PeriodicalSearchActions from '../periodical-search/periodical-search.actions';
import {loadDocumentDetailSuccess} from '../../../../shared/state/document-detail/document-detail.actions';
import {DocumentTypeEnum} from '../../../constants/document-type';
import {handleFacetsWithOperators} from '../../../../shared/utils/facet-utils';
import {UserService} from '../../../../shared/services/user.service';

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
      mergeMap(({ uuid, filters, page, pageCount, sortBy, sortDirection }) => {
        console.log('triggerDocumentLoad$ - filters:', {
          uuid,
          filters,
          page,
          pageCount,
          sortBy,
          sortDirection
        });

        return [
          DocumentDetailActions.loadDocumentDetail({ uuid }),
          PeriodicalDetailActions.setPeriodicalSearchParams({ filters, page, pageCount, sortBy, sortDirection })
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

        const { filters, page, pageCount, sortBy, sortDirection } = params;
        console.log('filters', filters);
        console.log('params', params);

        if (data.model !== DocumentTypeEnum.periodical && data.model !== DocumentTypeEnum.periodicalvolume) {
          return of(loadPeriodicalFailure({ error: 'Unsupported model type' }));
        }

        const periodical = parsePeriodicalItemFromMetadata(data);

        if (data.model === DocumentTypeEnum.periodical) {
          return this.solr.getPeriodicalVolumesWithFacets(data.uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection).pipe(
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
          return this.solr.getPeriodicalItemsWithFacets(data.uuid, filters, facetOperators, page, pageCount, sortBy, sortDirection).pipe(
            withLatestFrom(this.store.select(selectAvailableYears)),
            switchMap(([{ children, facets, facetsWithoutLicenses }, previousAvailableYears]) => {
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
      .filter(v => !!v['date.str'] && !!v['pid'] && !!v['accessibility'])
      .map(v => ({
        year: v['date.str'],
        model: v['model'] || '',
        pid: v['pid'],
        licenses: v['licenses.facet'],
        exists: true as const,
        accessibility: v['accessibility'] as DocumentAccessibilityEnum
      }));
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
}
