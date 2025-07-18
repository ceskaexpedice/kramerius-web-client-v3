import { createAction, props } from '@ngrx/store';
import {PeriodicalItem} from '../../../models/periodical-item';
import {ItemCard} from '../../../../shared/components/item-card/item-card.component';

export const loadPeriodicals = createAction('[Periodicals] Load');
export const loadPeriodicalsSuccess = createAction('[Periodicals] Load Success', props<{ data: ItemCard[] }>());
export const loadPeriodicalsFailure = createAction('[Periodicals] Load Failure', props<{ error: any }>());
