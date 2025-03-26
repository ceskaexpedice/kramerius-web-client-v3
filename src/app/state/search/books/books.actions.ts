import { createAction, props } from '@ngrx/store';

export const loadBooks = createAction('[Books] Load');
export const loadBooksSuccess = createAction('[Books] Load Success', props<{ data: any[] }>());
export const loadBooksFailure = createAction('[Books] Load Failure', props<{ error: any }>());
