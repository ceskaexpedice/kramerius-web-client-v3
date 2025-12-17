import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CollectionsState } from './collections.reducer';
import { selectRouterQueryParams } from '../router/router.selectors';
import { SolrOperators } from '../../../core/solr/solr-helpers';
import { Metadata } from '../../models/metadata.model';

export const selectCollectionsState = createFeatureSelector<CollectionsState>('collections');

export const selectCollectionSearchResults = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.results
);

export const selectCollectionSearchResultsTotalCount = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state?.totalCount ?? 0
);

export const selectCollectionDetail = createSelector(
  selectCollectionsState,
  (state: CollectionsState): Metadata | null => state?.detail ?? null
);

export const selectCollectionDetailLoading = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state?.detailLoading ?? false
);

export const selectCollectionDetailError = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state?.detailError ?? null
);

export const selectCollectionFacets = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.facets
);

export const selectCollectionSearchResultsLoading = createSelector(
  selectCollectionsState,
  state => state?.loading
);

export const selectCollectionSearchResultsError = createSelector(
  selectCollectionsState,
  state => state.error
);

export const selectCollectionFacetItems = (facetKey: string) => createSelector(
  selectCollectionFacets,
  (facets) => facets[facetKey] || []
);

export const selectCollectionFacetOperators = createSelector(
  selectRouterQueryParams,
  (params): { [field: string]: SolrOperators } => {
    const operators: { [field: string]: SolrOperators } = {};

    Object.entries(params).forEach(([key, value]) => {
      if (key.endsWith('_operator') && (value === SolrOperators.and || value === SolrOperators.or)) {
        const field = key.replace('_operator', '');
        operators[field] = value;
      }
    });

    return operators;
  }
);

export const selectCollectionActiveFilters = createSelector(
  selectRouterQueryParams,
  (state) => {
    let filters: string[] = [];
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

// Selectors for ALL collections (for admin operations, dialogs, etc.)
export const selectAllCollections = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.allCollections
);

export const selectAllCollectionsLoading = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.allCollectionsLoading
);

export const selectAllCollectionsError = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.allCollectionsError
);

export const selectAllCollectionsTotalCount = createSelector(
  selectCollectionsState,
  (state: CollectionsState) => state.allCollectionsTotalCount
);
