import { createSelector } from '@ngrx/store';
import { SearchState } from './search.reducer';
import { selectRouterQueryParams } from '../../../shared/state/router/router.selectors';
import { SolrOperators } from '../../../core/solr/solr-helpers';
import { DocumentTypeEnum } from '../../constants/document-type';

export const selectSearchState = (state: any) => state['search-results'];

export const selectSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results
);

export const selectNonPageSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results && state.results.filter(s =>
    s.model !== DocumentTypeEnum.page &&
    !s.ownModelPath?.includes(DocumentTypeEnum.page) &&
    s.model !== DocumentTypeEnum.article &&
    s.model !== DocumentTypeEnum.supplement
  )
);

export const selectArticleSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results && state.results.filter(s => s.model === DocumentTypeEnum.article)
);

export const selectPageSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.pageResults
);

export const selectPageSearchResultsTotalCount = createSelector(
  selectSearchState,
  (state: SearchState) => state?.pageTotalCount ?? 0
);

export const selectPageSearchResultsLoading = createSelector(
  selectSearchState,
  state => state?.pageResultsLoading
);

export const selectAttachmentSearchResults = createSelector(
  selectSearchState,
  (state: SearchState) => state.results && state.results.filter(s => s.model === DocumentTypeEnum.supplement)
);

export const selectSearchResultsTotalCount = createSelector(
  selectSearchState,
  (state: SearchState) => state?.totalCount ?? 0
);

export const selectUnifiedTotalCount = createSelector(
  selectSearchState,
  (state: SearchState) => (state?.totalCount ?? 0) + (state?.pageTotalCount ?? 0)
);

export const selectLastSearchPayload = createSelector(
  selectSearchState,
  (state: SearchState) => state?.lastSearchPayload ?? null
);

export const selectLastPageSearchPayload = createSelector(
  selectSearchState,
  (state: SearchState) => state?.lastPageSearchPayload ?? null
);

export const selectFacets = createSelector(
  selectSearchState,
  (state: SearchState) => {
    return state.facets
  }
);

export const selectSearchResultsLoading = createSelector(
  selectSearchState,
  state => state?.resultsLoading
);

export const selectFacetsLoading = createSelector(
  selectSearchState,
  state => state?.facetsLoading
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
