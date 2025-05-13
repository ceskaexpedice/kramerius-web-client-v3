import { createAction, props } from '@ngrx/store';
import {AvailableYear, PeriodicalItemYear} from '../../models/periodical-item';

export const loadPeriodical = createAction('[Periodical] Load');

export const loadPeriodicalSuccess = createAction(
  '[Periodical] Load Success',
  props<{ document: any; years: PeriodicalItemYear[]; availableYears: AvailableYear[] }>()
);

export const loadPeriodicalFailure = createAction(
  '[Periodical] Load Failure',
  props<{ error: any }>()
);

export const loadPeriodicalYears = createAction('[PeriodicalDetail] Load Years');

export const loadPeriodicalYearsSuccess = createAction(
  '[PeriodicalDetail] Load Years Success',
  props<{ years: PeriodicalItemYear[] }>()
);

export const loadPeriodicalYearsFailure = createAction(
  '[PeriodicalDetail] Load Years Failure',
  props<{ error: any }>()
);
