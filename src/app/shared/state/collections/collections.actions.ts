import { createAction, props } from '@ngrx/store';
import { FacetItem } from '../../../modules/models/facet-item';
import { SolrOperators, SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';
import { Metadata } from '../../models/metadata.model';

export const loadCollectionSearchResults = createAction(
  '[Collections] Load Search Results',
  props<{
    uuid: string;
    query: string;
    filters: string[];
    advancedQuery?: string;
    advancedQueryMainOperator?: SolrOperators;
    page: number;
    pageCount: number;
    sortBy: SolrSortFields;
    sortDirection: SolrSortDirections;
  }>()
);

export const loadCollectionSearchResultsSuccess = createAction(
  '[Collections] Load Search Results Success',
  props<{ results: any[]; totalCount: number }>()
);

export const loadCollectionFacetsSuccess = createAction(
  '[Collections] Load Facets Success',
  props<{ facets: { [key: string]: FacetItem[] } }>()
);

export const loadCollectionSearchResultsFailure = createAction(
  '[Collections] Load Search Results Failure',
  props<{ error: any }>()
);

export const loadCollectionDetail = createAction(
  '[Collections] Load Detail',
  props<{
    uuid: string;
  }>()
);

export const loadCollectionDetailSuccess = createAction(
  '[Collections] Load Detail Success',
  props<{ detail: Metadata }>()
);

export const loadCollectionDetailFailure = createAction(
  '[Collections] Load Detail Failure',
  props<{ error: any }>()
);

export const loadCollectionFacet = createAction(
  '[Collections] Load Facet',
  props<{
    uuid: string;
    query: string;
    filters: string[];
    facet: string;
    contains?: string;
    ignoreCase?: boolean;
    facetLimit?: number;
    facetOffset?: number;
    sortBy?: 'count' | 'name';
  }>()
);

export const loadCollectionFacetSuccess = createAction(
  '[Collections] Load Facet Success',
  props<{ facet: string; items: FacetItem[] }>()
);

export const loadCollectionFacetFailure = createAction(
  '[Collections] Load Facet Failure',
  props<{ facet: string; error: any }>()
);

export const clearCollectionSearch = createAction('[Collections] Clear Search');
