import { createAction, props } from '@ngrx/store';
import {SearchDocument} from '../../../models/search-document';

export const loadPeriodicals = createAction('[Periodicals] Load');
export const loadPeriodicalsSuccess = createAction('[Periodicals] Load Success', props<{ data: SearchDocument[] }>());
export const loadPeriodicalsFailure = createAction('[Periodicals] Load Failure', props<{ error: any }>());
