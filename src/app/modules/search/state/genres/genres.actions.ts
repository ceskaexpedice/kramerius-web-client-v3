import { createAction, props } from '@ngrx/store';

export const loadGenres = createAction('[Genres] Load');
export const loadGenresSuccess = createAction('[Genres] Load Success', props<{ data: any[] }>());
export const loadGenresFailure = createAction('[Genres] Load Failure', props<{ error: any }>());
