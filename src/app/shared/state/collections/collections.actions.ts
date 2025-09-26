import { createAction, props } from '@ngrx/store';
import { SearchDocument } from '../../../modules/models/search-document';

export const loadCollections = createAction(
  '[Collections] Load',
  props<{
    query?: string;
    page?: number;
    pageSize?: number;
    reset?: boolean;
  }>()
);

export const loadCollectionsSuccess = createAction(
  '[Collections] Load Success',
  props<{
    data: SearchDocument[];
    totalCount: number;
    page: number;
    hasMore: boolean;
  }>()
);

export const loadCollectionsFailure = createAction(
  '[Collections] Load Failure',
  props<{ error: any }>()
);

export const searchCollections = createAction(
  '[Collections] Search',
  props<{ query: string }>()
);

export const loadMoreCollections = createAction('[Collections] Load More');

export const clearCollectionsSearch = createAction('[Collections] Clear Search');