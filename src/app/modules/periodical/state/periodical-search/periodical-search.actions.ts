import { createAction, props } from '@ngrx/store';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';

export const loadPeriodicalSearchResults = createAction('[Periodical Search] Load Periodical Search Results', props<{ uuid: string; query: string; filters: string[], advancedQuery?: string, advancedQueryMainOperator?: SolrOperators, page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections  }>());
export const loadPeriodicalSearchSuccess = createAction('[Periodical Search] Load Success', props<{ results: any[], totalCount: number }>());
export const loadPeriodicalSearchFailure = createAction('[Periodical Search] Load Failure', props<{ error: any }>());

export const loadFacet = createAction(
  '[Periodical Search] Load Facet',
  props<{ uuid: string; query: string; filters: string[], advancedQuery?: string, advancedQueryMainOperator?: SolrOperators, page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections}>());

export const loadFacetsSuccess = createAction(
  '[Periodical Search] Load Facets Success',
  props<{ facets: { [key: string]: any[] } }>()
);

export const loadFacetSuccess = createAction(
  '[Periodical Search] Load Facet Success',
  props<{ facet: string; items: any[] }>()
);

export const loadFacetFailure = createAction(
  '[Periodical Search] Load Facet Failure',
  props<{ facet: string; error: any }>()
);
