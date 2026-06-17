import { Observable } from 'rxjs';
import { ActivatedRoute } from '@angular/router';
import { InjectionToken, Signal } from '@angular/core';
import { SolrOperators, SolrSortFields } from '../../core/solr/solr-helpers';
import { FacetItem } from '../../modules/models/facet-item';

export const FILTER_SERVICE = new InjectionToken<FilterService>('FilterService');

/**
 * Parameters for loading a single facet's page in the "show more" filter dialog.
 * Mirrors the controls the dialog exposes: pending selection/operator, free-text
 * contains, sort and pagination.
 */
export interface FacetPageQuery {
  /** Values the user has toggled in the dialog but not yet applied. */
  pendingSelection: Set<string>;
  /** Operator (AND/OR) applied to the pending selection. */
  pendingOperator: SolrOperators;
  /** Free-text filter typed into the dialog's search box. */
  contains: string;
  sortBy: SolrSortFields;
  /** Facet limit; -1 loads all items (used to compute the total count). */
  limit: number;
  offset: number;
}

export interface FacetPageResult {
  items: FacetItem[];
  /** Total (unpaginated) number of matching facet values. */
  totalCount: number;
}

/**
 * Snapshot of the Solr facet request a page used for its last search. Captured by
 * each FilterService at dispatch time and replayed (with one facet.field +
 * pagination) by the "show more" dialog, so the dialog's counts always match the
 * page's results without re-deriving the scope/filters a second time.
 */
export interface FacetRequest {
  /** Resolved q text the page searched with. */
  query: string;
  /** Final, mapped fq list the page applied. */
  filters: string[];
  filterGroups?: string[][];
  facetOperators?: Record<string, SolrOperators>;
  advancedQuery?: string;
  includePeriodicalItem?: boolean;
  includePage?: boolean;
  /** Periodical scope (root.pid). */
  rootPid?: string | null;
  /** Collection scope (in_collections). */
  collectionUuid?: string | null;
  /** Generic extra q clause AND-appended (e.g. monograph own_parent.pid). */
  extraQueryClause?: string | null;
  availabilityFilter?: { isActive: boolean; licenses: string[]; userLicenses?: string[] };
}

export interface FilterService {
  load(): Promise<void>;
  getFacets(): Observable<any>;
  getFiltersWithOperators(): Observable<Record<string, string>>;
  toggleFilter(route: ActivatedRoute, fullValue: string): void;
  /** Write the dialog's applied selection for a facet to the URL. */
  updateFilters(route: ActivatedRoute, facetKey: string, selectedValues: string[]): void;
  resetPage(): void;
  facetsLoading$?: Observable<boolean | undefined>;
  /** Whether a search term has been submitted (drives basic-search-only facets). */
  hasSubmittedQuery: Signal<boolean>;
  /** Whether a fulltext filter is active (drives basic-search-only facets). */
  hasFulltextFilter: Signal<boolean>;
  /** Whether the active filters include a date/year constraint. */
  filtersContainDate: Signal<boolean>;
  /**
   * Load a single facet's items for the "show more" dialog, scoped to this page's
   * search context (basic search, folder, monograph, …), honoring pending
   * selection/operator, free-text contains, sort and pagination. Returns the
   * parsed items plus the total (unpaginated) count.
   */
  loadFacetPage(facetKey: string, query: FacetPageQuery): Observable<FacetPageResult>;
}
