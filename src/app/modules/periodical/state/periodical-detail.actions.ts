import { createAction, props } from '@ngrx/store';
import {PeriodicalItem, PeriodicalItemYear} from '../../models/periodical-item';

export const loadPeriodical = createAction('[Periodical] Load', props<{ uuid: string }>());
export const loadPeriodicalSuccess = createAction('[Periodical] Load Success', props<{ document: PeriodicalItem; years: PeriodicalItemYear[]; availableYears: PeriodicalItemYear[]; children?: any[] }>());
export const loadPeriodicalFailure = createAction('[Periodical] Load Failure', props<{ error: any }>());
