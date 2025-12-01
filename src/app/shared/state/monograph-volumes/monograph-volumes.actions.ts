import { createAction, props } from '@ngrx/store';
import { Metadata } from '../../models/metadata.model';

export const loadMonographVolumes = createAction(
  '[MonographVolumes] Load',
  props<{ uuid: string }>()
);

export const loadMonographVolumesSuccess = createAction(
  '[MonographVolumes] Load Success',
  props<{ parent: Metadata; volumes: any[] }>()
);

export const loadMonographVolumesFailure = createAction(
  '[MonographVolumes] Load Failure',
  props<{ error: any }>()
);

export const clearMonographVolumes = createAction(
  '[MonographVolumes] Clear'
);
