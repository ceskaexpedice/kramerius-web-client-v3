import { createAction, props } from '@ngrx/store';
import {SearchDocument} from '../../../models/search-document';

export const loadBooks = createAction('[Books] Load');
export const loadBooksSuccess = createAction('[Books] Load Success', props<{ data: SearchDocument[] }>());
export const loadBooksFailure = createAction('[Books] Load Failure', props<{ error: any }>());
