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
    sortDirection: SolrSortDirections.asc
  },
  monthIssues: {},
  monthLoading: {}
};

export const periodicalDetailReducer = createReducer(
  initialState,
  on(loadPeriodical, state => ({ ...state, loading: true })),
  on(setPeriodicalSearchParams, (state, { filters, advancedQuery, page, pageCount, sortBy, sortDirection }) => {
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
        sortDirection
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
  on(loadMonthIssues, (state, { year, month }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return {
      ...state,
      monthLoading: { ...state.monthLoading, [key]: true }
    };
  }),
  on(loadMonthIssuesSuccess, (state, { year, month, issues }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return {
      ...state,
      monthIssues: { ...state.monthIssues, [key]: issues },
      monthLoading: { ...state.monthLoading, [key]: false }
    };
  }),
  on(loadMonthIssuesFailure, (state, { year, month }) => {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    return {
      ...state,
      monthLoading: { ...state.monthLoading, [key]: false }
    };
  }),
);
