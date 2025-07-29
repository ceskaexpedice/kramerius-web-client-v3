import { createAction, props } from '@ngrx/store';
import {PeriodicalItem, PeriodicalItemYear} from '../../models/periodical-item';
import {Metadata} from '../../../shared/models/metadata.model';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../../core/solr/solr-helpers';

export const loadPeriodical = createAction('[Periodical] Load', props<{ uuid: string }>());
export const loadPeriodicalSearchResults = createAction('[Periodical] Load Search Results', props<{ uuid: string; query: string; filters: string[], advancedQuery?: string, advancedQueryMainOperator?: SolrOperators, page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections  }>());
export const loadPeriodicalSuccess = createAction('[Periodical] Load Success', props<{ document: PeriodicalItem; metadata: Metadata; years: PeriodicalItemYear[]; availableYears: PeriodicalItemYear[]; children?: any[] }>());
export const loadPeriodicalFailure = createAction('[Periodical] Load Failure', props<{ error: any }>());
