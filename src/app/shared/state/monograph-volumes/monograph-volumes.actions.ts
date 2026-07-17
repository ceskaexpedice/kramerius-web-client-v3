import { createAction, props } from '@ngrx/store';
import { Metadata } from '../../models/metadata.model';
import { SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';

export const loadMonographVolumes = createAction(
  '[MonographVolumes] Load',
  props<{ uuid: string; filters: string[]; sort?: string | null }>()
);

export const loadMonographVolumesSuccess = createAction(
  '[MonographVolumes] Load Success',
  props<{ parent: Metadata; volumes: any[]; facets: any }>()
);

export const loadMonographVolumesFailure = createAction(
  '[MonographVolumes] Load Failure',
  props<{ error: any }>()
);

export const clearMonographVolumes = createAction(
  '[MonographVolumes] Clear'
);

export const loadMonographVolumesSearchResults = createAction(
  '[MonographVolumes] Load Search Results',
  props<{ uuid: string; query: string; filters: string[]; page: number; pageCount: number; sortBy?: SolrSortFields; sortDirection?: SolrSortDirections }>()
);

export const loadMonographVolumesSearchSuccess = createAction(
  '[MonographVolumes] Load Search Results Success',
  props<{ results: any[]; totalCount: number }>()
);

export const loadMonographVolumesSearchFailure = createAction(
  '[MonographVolumes] Load Search Results Failure',
  props<{ error: any }>()
);

export const clearMonographVolumesSearch = createAction(
  '[MonographVolumes] Clear Search Results'
);
