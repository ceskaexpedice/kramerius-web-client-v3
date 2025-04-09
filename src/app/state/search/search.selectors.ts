import { createSelector } from '@ngrx/store';
import { SearchState } from './search.reducer';

export const selectSearchState = (state: any) => state['search-results'];

export const selectSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results
);

export const selectFacets = createSelector(
  selectSearchState,
  (state: SearchState) => state.facets
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
