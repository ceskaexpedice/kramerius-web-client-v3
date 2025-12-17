import { createAction, props } from '@ngrx/store';

export interface License {
  name: string;
  description: string;
  id: number;
  priority: number;
  group: 'local' | 'embedded';
}

export const loadLicenses = createAction(
  '[Licenses] Load',
  props<{
    query?: string;
    page?: number;
    pageSize?: number;
    reset?: boolean;
  }>()
);

export const loadLicensesSuccess = createAction(
  '[Licenses] Load Success',
  props<{
    data: License[];
    totalCount: number;
    page: number;
    hasMore: boolean;
  }>()
);

export const loadLicensesFailure = createAction(
  '[Licenses] Load Failure',
  props<{ error: any }>()
);

export const searchLicenses = createAction(
  '[Licenses] Search',
  props<{ query: string }>()
);

export const loadMoreLicenses = createAction('[Licenses] Load More');

export const clearLicensesSearch = createAction('[Licenses] Clear Search');