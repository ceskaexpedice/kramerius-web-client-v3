import { createAction, props } from '@ngrx/store';
import {PeriodicalItem, PeriodicalItemYear} from '../../../models/periodical-item';
import {Metadata} from '../../../../shared/models/metadata.model';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';
import {FacetItem} from '../../../models/facet-item';

export const loadPeriodical = createAction('[Periodical] Load', props<{ uuid: string; filters: string[], advancedQuery?: string, page: number, pageCount: number, sortBy: SolrSortFields, sortDirection: SolrSortDirections, cdkCollection?: string | null }>());
// `availableYearsRootPid` says which periodical the years belong to. The list is
// cached in the store and reused across navigations to save a volumes request,
// but it is only valid for its own title - without the root pid, opening another
// periodical kept the previous one's volumes and the calendar queried the wrong
// title (issue #169).
export const loadPeriodicalSuccess = createAction('[Periodical] Load Success', props<{ document: PeriodicalItem; metadata: Metadata; years: PeriodicalItemYear[]; availableYears: PeriodicalItemYear[]; availableYearsRootPid?: string | null; children?: any[]; facets?: { [key: string]: FacetItem[] } }>());
export const loadPeriodicalFailure = createAction('[Periodical] Load Failure', props<{ error: any }>());

export const setPeriodicalSearchParams = createAction('[Periodical] Set Search Params', props<{
  filters: string[];
  advancedQuery?: string;
  page: number;
  pageCount: number;
  sortBy: SolrSortFields;
  sortDirection: SolrSortDirections;
  cdkCollection?: string | null;
}>());

export const loadPeriodicalItems = createAction('[Periodical] Load Items', props<{ parentVolumeUuid: string }>());
export const loadPeriodicalItemsSuccess = createAction('[Periodical] Load Items Success', props<{ children: any[]; availableYears?: PeriodicalItemYear[]; availableYearsRootPid?: string | null }>());
export const loadPeriodicalItemsFailure = createAction('[Periodical] Load Items Failure', props<{ error: any }>());

export const loadMonthIssues = createAction(
  '[Periodical] Load Month Issues',
  props<{ parentVolumeUuid: string; year: number; month: number }>() // month: 1-12
);

// `parentVolumeUuid` is carried through the whole round trip: the month cache is
// keyed per volume, so a response must be filed under the volume it was requested
// for. Without it, two periodicals sharing a year/month would overwrite and read
// each other's issues.
export const loadMonthIssuesSuccess = createAction(
  '[Periodical] Load Month Issues Success',
  props<{ parentVolumeUuid: string; year: number; month: number; issues: any[] }>()
);

export const loadMonthIssuesFailure = createAction(
  '[Periodical] Load Month Issues Failure',
  props<{ parentVolumeUuid: string; year: number; month: number; error: any }>()
);
