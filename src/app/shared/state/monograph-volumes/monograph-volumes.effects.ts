import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, map, switchMap } from 'rxjs/operators';
import { forkJoin, of } from 'rxjs';
import * as MonographVolumesActions from './monograph-volumes.actions';
import { SolrService } from '../../../core/solr/solr.service';
import { Store } from '@ngrx/store';
import { fromSolrToMetadata } from '../../models/metadata.model';
import { UserService } from '../../services/user.service';
import { handleFacetsWithOperators } from '../../utils/facet-utils';
import { facetKeysEnum } from '../../../modules/search-results-page/const/facets';
import { CustomSearchService } from '../../services/custom-search.service';

@Injectable()
export class MonographVolumesEffects {
  constructor(
    private actions$: Actions,
    private solr: SolrService,
    private store: Store,
    private userService: UserService,
    private customSearchService: CustomSearchService,
  ) {}

  loadMonographVolumes$ = createEffect(() => {
    return this.actions$.pipe(
      ofType(MonographVolumesActions.loadMonographVolumes),
      switchMap(({ uuid, filters }) => {
        const facetFields = [facetKeysEnum.license];

        // Availability filter: active when "Available only" toggle is ON
        const availabilityFilter = {
          isActive: this.customSearchService.isAvailabilityFilterActive(),
          licenses: this.customSearchService.getUserAvailableLicenses(),
          userLicenses: this.userService.licenses
        };

        console.log('Effect - Loading volumes with filters:', filters);

        return forkJoin({
          parent: this.solr.getDetailItem(uuid),
          volumesWithFacets: this.solr.getChildrenByModel(uuid, 'rels_ext_index.sort asc', null, true, facetFields, filters, {}, availabilityFilter),
        }).pipe(
          map(({ parent, volumesWithFacets }) => {
            const volumes = volumesWithFacets.docs || [];
            const rawFacets = volumesWithFacets.facets || {};
            const facetQueries = volumesWithFacets.facetQueries || {};
            const numFound = volumesWithFacets.numFound || 0;

            // Parse facets using the same utility as search results
            const facets = handleFacetsWithOperators(
              rawFacets,
              rawFacets,
              {},
              rawFacets,
              this.userService.licenses,
              numFound,
              filters,
              facetQueries
            );

            console.log('Loaded monograph volumes with facets:', { parent, volumes, facets, filters });

            return MonographVolumesActions.loadMonographVolumesSuccess({
              parent: fromSolrToMetadata(parent),
              volumes,
              facets,
            });
          }),
          catchError(error => {
            console.log('Error loading monograph volumes:', error);
            return of(MonographVolumesActions.loadMonographVolumesFailure({ error }));
          })
        );
      })
    );
  });
}
