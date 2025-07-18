import { createAction, props } from '@ngrx/store';
import {ItemCard} from '../../../../shared/components/item-card/item-card.component';

export const loadBooks = createAction('[Books] Load');
export const loadBooksSuccess = createAction('[Books] Load Success', props<{ data: ItemCard[] }>());
export const loadBooksFailure = createAction('[Books] Load Failure', props<{ error: any }>());
