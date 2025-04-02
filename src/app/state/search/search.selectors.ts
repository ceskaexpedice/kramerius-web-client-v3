import { createFeatureSelector, createSelector } from '@ngrx/store';
import { SearchResultState } from './search.reducer';

export const selectSearchResultState = createFeatureSelector<SearchResultState>('search-results');

export const selectSearchResults = createSelector(
  selectSearchResultState,
  state => state.results
);

export const selectFacets = createSelector(
  selectSearchResultState,
  state => state.facets
);

export const selectSearchResultsLoading = createSelector(
  selectSearchResultState,
  state => state.loading
);

export const selectSearchResultsError = createSelector(
  selectSearchResultState,
  state => state.error
);
