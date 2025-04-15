import { createSelector } from '@ngrx/store';
import { SearchState } from './search.reducer';
import {selectRouterQueryParams} from '../router/router.selectors';

export const selectSearchState = (state: any) => state['search-results'];

export const selectSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results
);

export const selectSearchResultsTotalCount = createSelector(
  selectSearchState,
  (state: SearchState) => state.totalCount
);

export const selectFacets = createSelector(
  selectSearchState,
  (state: SearchState) => {
    return state.facets
  }
);

export const selectSearchResultsLoading = createSelector(
  selectSearchState,
  state => state.loading
);

export const selectSearchResultsError = createSelector(
  selectSearchState,
  state => state.error
);

export const selectFacetItems = (facetKey: string) => createSelector(
  selectFacets,
  (facets) => facets[facetKey] || []
);

export const selectFacetOperators = createSelector(
  selectRouterQueryParams,
  (params): { [field: string]: 'AND' | 'OR' } => {
    const operators: { [field: string]: 'AND' | 'OR' } = {};

    Object.entries(params).forEach(([key, value]) => {
      if (key.endsWith('_operator') && (value === 'AND' || value === 'OR')) {
        const field = key.replace('_operator', '');
        operators[field] = value;
      }
    });

    return operators;
  }
);

export const selectActiveFilters = createSelector(
  selectRouterQueryParams,
  (state) => {
    let filters: string[] = [];
    console.log('state', state);
    if (state.fq) {
      const isArray = Array.isArray(state.fq);

      if (isArray) {
        filters = state.fq;
      } else if (typeof state.fq === 'string') {
        filters = [state.fq];
      }

    }
    return filters;
  }
);
