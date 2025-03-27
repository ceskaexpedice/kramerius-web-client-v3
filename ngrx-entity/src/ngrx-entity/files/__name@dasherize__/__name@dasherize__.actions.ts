import { createAction, props } from '@ngrx/store';

export const load<%= classify(name) %> = createAction('[<%= classify(name) %>] Load');
export const load<%= classify(name) %>Success = createAction('[<%= classify(name) %>] Load Success', props<{ data: <%= classify(name) %>any[] }>());
export const load<%= classify(name) %>Failure = createAction('[<%= classify(name) %>] Load Failure', props<{ error: any }>());
