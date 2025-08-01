import { createAction, props } from '@ngrx/store';
import {PeriodicalItem, PeriodicalItemYear} from '../../../models/periodical-item';
import {Metadata} from '../../../../shared/models/metadata.model';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';

export const loadPeriodical = createAction('[Periodical] Load', props<{ uuid: string; filters: string[], page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections }>());
export const loadPeriodicalSuccess = createAction('[Periodical] Load Success', props<{ document: PeriodicalItem; metadata: Metadata; years: PeriodicalItemYear[]; availableYears: PeriodicalItemYear[]; children?: any[] }>());
export const loadPeriodicalFailure = createAction('[Periodical] Load Failure', props<{ error: any }>());

export const setPeriodicalSearchParams = createAction('[Periodical] Set Search Params', props<{
  filters: string[];
  page: number;
  pageCount: number;
  sortBy: SolrSortFields;
  sortDirection: SolrSortDirections;
}>());
