import { createAction, props } from '@ngrx/store';
import {FacetItem} from '../../modules/models/facet-item';

export const loadSearchResults = createAction(
  '[SearchResults] Load',
  props<{ query: string; filters: string[] }>()
);

export const loadSearchResultsSuccess = createAction(
  '[SearchResults] Load Success',
  props<{ results: any[] }>() // len výsledky
);

export const loadFacetsSuccess = createAction(
  '[SearchResults] Load Facets Success',
  props<{ facets: { [key: string]: FacetItem[] } }>()
);

export const loadSearchResultsFailure = createAction(
  '[SearchResults] Load Failure',
  props<{ error: any }>()
);

export const loadFacet = createAction(
  '[SearchResults] Load Facet',
  props<{ query: string; filters: string[]; facet: string }>()
);

export const loadFacetSuccess = createAction(
  '[SearchResults] Load Facet Success',
  props<{ facet: string; items: FacetItem[] }>()
);

export const loadFacetFailure = createAction(
  '[SearchResults] Load Facet Failure',
  props<{ facet: string; error: any }>()
);
