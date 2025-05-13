import { createAction, props } from '@ngrx/store';
import {PeriodicalItem} from '../../../models/periodical-item';

export const loadPeriodicals = createAction('[Periodicals] Load');
export const loadPeriodicalsSuccess = createAction('[Periodicals] Load Success', props<{ data: PeriodicalItem[] }>());
export const loadPeriodicalsFailure = createAction('[Periodicals] Load Failure', props<{ error: any }>());
