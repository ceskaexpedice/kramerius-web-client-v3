import { createFeatureSelector, createSelector } from '@ngrx/store';
import { MonographVolumesState } from './monograph-volumes.reducer';
import { selectRouterParams } from '../router/router.selectors';

export const selectMonographVolumesState = createFeatureSelector<MonographVolumesState>('monograph-volumes');

export const selectMonographVolumesParent = createSelector(
  selectMonographVolumesState,
  state => state?.parent
);

export const selectMonographVolumes = createSelector(
  selectMonographVolumesState,
  state => state?.volumes
);

export const selectMonographVolumesLoading = createSelector(
  selectMonographVolumesState,
  state => state?.loading
);

export const selectMonographVolumesError = createSelector(
  selectMonographVolumesState,
  state => state?.error
);

export const selectMonographVolumesUuid = createSelector(
  selectRouterParams,
  params => params['uuid']
);

export const selectMonographVolumesFacets = createSelector(
  selectMonographVolumesState,
  state => state?.facets
);

export const selectMonographVolumesFacetsLoading = createSelector(
  selectMonographVolumesState,
  state => state?.facetsLoading
);

export const selectMonographVolumesFacetsError = createSelector(
  selectMonographVolumesState,
  state => state?.facetsError
);
