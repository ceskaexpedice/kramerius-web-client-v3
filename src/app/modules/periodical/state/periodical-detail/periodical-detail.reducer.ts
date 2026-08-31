import { createReducer, on } from '@ngrx/store';
import {
  loadPeriodical, loadPeriodicalFailure,
  loadPeriodicalSuccess, setPeriodicalSearchParams,
  loadPeriodicalItems, loadPeriodicalItemsSuccess, loadPeriodicalItemsFailure, loadMonthIssues, loadMonthIssuesSuccess,
  loadMonthIssuesFailure,
} from './periodical-detail.actions';
import {PeriodicalItem, PeriodicalItemChild, PeriodicalItemYear} from '../../../models/periodical-item';
import {Metadata} from '../../../../shared/models/metadata.model';
import {SolrOperators, SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';
import {monthCacheKey} from './periodical-detail.selectors';

export interface PeriodicalDetailState {
  document: PeriodicalItem | null;
  metadata: Metadata | null;
  years: PeriodicalItemYear[];
  availableYears: PeriodicalItemYear[];
  children: PeriodicalItemChild[];
  loading: boolean;
  error: any;
  searchParams: {
    filters: string[];
    advancedQuery?: string;
    page: number;
    pageCount: number;
    sortBy: any;
    sortDirection: any;
    cdkCollection?: string | null;
  };
  monthIssues: Record<string, any[]>;
  monthLoading: Record<string, boolean>;
}

export const initialState: PeriodicalDetailState = {
  document: null,
  metadata: null,
  years: [],
  availableYears: [],
  children: [],
  loading: false,
  error: null,
  searchParams: {
    filters: [],
    advancedQuery: '',
    page: 1,
    pageCount: 10000,
    sortBy: SolrSortFields.dateMin,
    sortDirection: SolrSortDirections.asc,
    cdkCollection: null
  },
  monthIssues: {},
  monthLoading: {}
};

export const periodicalDetailReducer = createReducer(
  initialState,
  on(loadPeriodical, state => ({
    ...state,
    loading: true,
    // Clear stale document/metadata so the header and metadata sidebar don't
    // keep rendering the previously opened periodical while the new one loads.
    document: null,
    metadata: null,
    // Drop the calendar's month cache as well: it belongs to the volumes of the
    // periodical being left behind and must not leak into the new one.
    monthIssues: {},
    monthLoading: {}
  })),
  on(setPeriodicalSearchParams, (state, { filters, advancedQuery, page, pageCount, sortBy, sortDirection, cdkCollection }) => {
    console.log('setPeriodicalSearchParams reducer - filters:', {
      filters,
      advancedQuery,
      page,
      pageCount,
      sortBy,
      sortDirection
    });
    return {
      ...state,
      searchParams: {
        filters,
        advancedQuery,
        page,
        pageCount,
        sortBy,
        sortDirection,
        cdkCollection
      }
    };
  }),
  on(loadPeriodicalSuccess, (state, { document, metadata, years, availableYears, children, facets }) => ({
    ...state,
    loading: false,
    facets: facets ?? {},
    document,
    metadata,
    years,
    availableYears: availableYears ?? state.availableYears,
    children: children || []
  })),
  on(loadPeriodicalFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(loadPeriodicalItems, state => ({ ...state, loading: true })),
  on(loadPeriodicalItemsSuccess, (state, { children, availableYears }) => ({
    ...state,
    loading: false,
    children: children || [],
    availableYears: availableYears ?? state.availableYears,
  })),
  on(loadPeriodicalItemsFailure, (state, { error }) => ({ ...state, loading: false, error })),
  on(loadMonthIssues, (state, { parentVolumeUuid, year, month }) => {
    const key = monthCacheKey(parentVolumeUuid, year, month);
    return {
      ...state,
      monthLoading: { ...state.monthLoading, [key]: true }
    };
  }),
  on(loadMonthIssuesSuccess, (state, { parentVolumeUuid, year, month, issues }) => {
    const key = monthCacheKey(parentVolumeUuid, year, month);
    return {
      ...state,
      monthIssues: { ...state.monthIssues, [key]: issues },
      monthLoading: { ...state.monthLoading, [key]: false }
    };
  }),
  on(loadMonthIssuesFailure, (state, { parentVolumeUuid, year, month }) => {
    const key = monthCacheKey(parentVolumeUuid, year, month);
    return {
      ...state,
      monthLoading: { ...state.monthLoading, [key]: false }
    };
  }),
);
