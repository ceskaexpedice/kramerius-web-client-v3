import { createAction, props } from '@ngrx/store';
import { FacetItem } from '../../models/facet-item';
import { SolrOperators, SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';

export const loadSearchResults = createAction(
  '[SearchResults] Load',
  props<{ query: string; filters: string[], advancedQuery?: string, advancedQueryMainOperator?: SolrOperators, page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections }>()
);

export const loadSearchResultsSuccess = createAction(
  '[SearchResults] Load Success',
  props<{ results: any[], totalCount: number }>()
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
  props<{
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

export const loadFacetSuccess = createAction(
  '[SearchResults] Load Facet Success',
  props<{ facet: string; items: FacetItem[] }>()
);

export const loadFacetFailure = createAction(
  '[SearchResults] Load Facet Failure',
  props<{ facet: string; error: any }>()
);

export const loadFacetsFailure = createAction(
  '[SearchResults] Load Facets Failure',
  props<{ error: any }>()
);
