/**
 * Generic interface for configurable UI items
 * Can be extended for columns, filters, facets, and other configurable elements
 */
export interface ConfigurableItem {
  id: string;
  labelKey: string;
  visible: boolean;
  order: number;
}

/**
 * Render types for table columns
 */
export enum ColumnRenderType {
  TEXT = 'text',
  COMPONENT = 'component',
  TEMPLATE = 'template',
  ARRAY = 'array'
}

/**
 * Configuration for a single table column
 */
export interface TableColumnConfig extends ConfigurableItem {
  field: string;
  renderType: ColumnRenderType;
  defaultVisible: boolean;
  componentName?: string; // For COMPONENT type: 'accessibility-badge', 'language-flags', etc.
  templateRef?: string; // For TEMPLATE type
  transform?: string; // For pipes: 'translate', 'pluralize:count-pages', etc.
  width?: string; // Optional column width
}

/**
 * Configuration for a single facet filter
 */
export interface FacetFilterConfig extends ConfigurableItem {
  facetKey: string;
  defaultVisible: boolean;
  isCustomDefined: boolean;
}

/**
 * Complete display configuration that can be extended with other UI configurations
 */
export interface DisplayConfig {
  tableColumns: TableColumnConfig[];
  facetFilters?: FacetFilterConfig[];
}

/**
 * Default table columns configuration
 */
export const DEFAULT_TABLE_COLUMNS: TableColumnConfig[] = [
  {
    id: 'title',
    labelKey: 'filter-title-label',
    field: 'title',
    renderType: ColumnRenderType.TEXT,
    visible: true,
    defaultVisible: true,
    order: 0,
    width: '300px'
  },
  {
    id: 'author',
    labelKey: 'filter-author-label',
    field: 'authors',
    renderType: ColumnRenderType.ARRAY,
    visible: true,
    defaultVisible: true,
    order: 1,
    width: '200px'
  },
  {
    id: 'year',
    labelKey: 'filter-year-label',
    field: 'date',
    renderType: ColumnRenderType.TEXT,
    visible: true,
    defaultVisible: true,
    order: 2,
    width: '100px'
  },
  {
    id: 'license',
    labelKey: 'filter-license-label',
    field: 'licenses',
    renderType: ColumnRenderType.COMPONENT,
    componentName: 'accessibility-badge',
    visible: true,
    defaultVisible: true,
    order: 3,
    width: '120px'
  },
  {
    id: 'doctype',
    labelKey: 'filter-doctype-label',
    field: 'model',
    renderType: ColumnRenderType.TEXT,
    transform: 'translate',
    visible: true,
    defaultVisible: true,
    order: 4,
    width: '150px'
  },
  {
    id: 'pageCount',
    labelKey: 'filter-count-label',
    field: 'count_page',
    renderType: ColumnRenderType.TEXT,
    transform: 'pluralize:count-pages',
    visible: true,
    defaultVisible: true,
    order: 5,
    width: '120px'
  },
  {
    id: 'languages',
    labelKey: 'filter-languages-label',
    field: 'languages',
    renderType: ColumnRenderType.COMPONENT,
    componentName: 'language-flags',
    visible: true,
    defaultVisible: true,
    order: 6,
    width: '150px'
  },
  {
    id: 'publicationPlaces',
    labelKey: 'filter-publication-places-label',
    field: 'publicationPlaces',
    renderType: ColumnRenderType.ARRAY,
    visible: false,
    defaultVisible: false,
    order: 7,
    width: '200px'
  },
  {
    id: 'keywords',
    labelKey: 'filter-keywords-label',
    field: 'keywords',
    renderType: ColumnRenderType.ARRAY,
    visible: false,
    defaultVisible: false,
    order: 8,
    width: '200px'
  },
  {
    id: 'mdt',
    labelKey: 'filter-mdt-label',
    field: 'mdt',
    renderType: ColumnRenderType.TEXT,
    visible: false,
    defaultVisible: false,
    order: 9,
    width: '150px'
  },
  {
    id: 'shelfLocators',
    labelKey: 'filter-shelf-locators-label',
    field: 'shelfLocators',
    renderType: ColumnRenderType.ARRAY,
    visible: false,
    defaultVisible: false,
    order: 10,
    width: '200px'
  },
  {
    id: 'idUrnnbn',
    labelKey: 'filter-id-urnnbn-label',
    field: 'idUrnnbn',
    renderType: ColumnRenderType.TEXT,
    visible: false,
    defaultVisible: false,
    order: 11,
    width: '180px'
  },
  {
    id: 'idOther',
    labelKey: 'filter-id-other-label',
    field: 'idOther',
    renderType: ColumnRenderType.TEXT,
    visible: false,
    defaultVisible: false,
    order: 12,
    width: '180px'
  },
  {
    id: 'physicalLocations',
    labelKey: 'filter-physical-locations-label',
    field: 'physicalLocations',
    renderType: ColumnRenderType.ARRAY,
    visible: false,
    defaultVisible: false,
    order: 13,
    width: '200px'
  },
  {
    id: 'genres',
    labelKey: 'filter-genres-label',
    field: 'genres',
    renderType: ColumnRenderType.ARRAY,
    visible: false,
    defaultVisible: false,
    order: 14,
    width: '200px'
  }
];

/**
 * Default facet filters configuration
 * Based on facets from the search-results-page const/facets.ts
 */
export const DEFAULT_FACET_FILTERS: FacetFilterConfig[] = [
  {
    id: 'custom-accessibility',
    labelKey: 'facet-accessibility-label',
    facetKey: 'custom-accessibility',
    visible: true,
    defaultVisible: true,
    order: 0,
    isCustomDefined: true
  },
  {
    id: 'custom-root-model',
    labelKey: 'facet-document-type-label',
    facetKey: 'custom-root-model',
    visible: true,
    defaultVisible: true,
    order: 1,
    isCustomDefined: true
  },
  {
    id: 'custom-where-to-search.model',
    labelKey: 'facet-where-to-search-label',
    facetKey: 'custom-where-to-search.model',
    visible: true,
    defaultVisible: true,
    order: 4,
    isCustomDefined: true
  },
  {
    id: 'custom-date-range',
    labelKey: 'facet-date-range-label',
    facetKey: 'custom-date-range',
    visible: true,
    defaultVisible: true,
    order: 2,
    isCustomDefined: true
  },
  {
    id: 'custom-year-range',
    labelKey: 'facet-year-range-label',
    facetKey: 'custom-year-range',
    visible: true,
    defaultVisible: true,
    order: 3,
    isCustomDefined: true
  },
  {
    id: 'authors.facet',
    labelKey: 'filter-author-label',
    facetKey: 'authors.facet',
    visible: true,
    defaultVisible: true,
    order: 5,
    isCustomDefined: false
  },
  {
    id: 'languages.facet',
    labelKey: 'filter-languages-label',
    facetKey: 'languages.facet',
    visible: true,
    defaultVisible: true,
    order: 6,
    isCustomDefined: false
  },
  {
    id: 'genres.facet',
    labelKey: 'filter-genres-label',
    facetKey: 'genres.facet',
    visible: true,
    defaultVisible: true,
    order: 7,
    isCustomDefined: false
  },
  {
    id: 'keywords.facet',
    labelKey: 'filter-keywords-label',
    facetKey: 'keywords.facet',
    visible: true,
    defaultVisible: true,
    order: 8,
    isCustomDefined: false
  },
  {
    id: 'geographic_names.facet',
    labelKey: 'facet-geographic-names-label',
    facetKey: 'geographic_names.facet',
    visible: true,
    defaultVisible: true,
    order: 9,
    isCustomDefined: false
  },
  {
    id: 'publishers.facet',
    labelKey: 'facet-publishers-label',
    facetKey: 'publishers.facet',
    visible: true,
    defaultVisible: true,
    order: 10,
    isCustomDefined: false
  },
  {
    id: 'publication_places.facet',
    labelKey: 'filter-publication-places-label',
    facetKey: 'publication_places.facet',
    visible: true,
    defaultVisible: true,
    order: 11,
    isCustomDefined: false
  },
  {
    id: 'physical_locations.facet',
    labelKey: 'filter-physical-locations-label',
    facetKey: 'physical_locations.facet',
    visible: true,
    defaultVisible: true,
    order: 12,
    isCustomDefined: false
  },
  {
    id: 'subject_names_personal.facet',
    labelKey: 'subject_names_personal.facet',
    facetKey: 'subject_names_personal.facet',
    visible: false,
    defaultVisible: false,
    order: 13,
    isCustomDefined: false
  },
  {
    id: 'subject_names_corporate.facet',
    labelKey: 'subject_names_corporate.facet',
    facetKey: 'subject_names_corporate.facet',
    visible: false,
    defaultVisible: false,
    order: 14,
    isCustomDefined: false
  },
  {
    id: 'subject_temporals.facet',
    labelKey: 'subject_temporals.facet',
    facetKey: 'subject_temporals.facet',
    visible: false,
    defaultVisible: false,
    order: 15,
    isCustomDefined: false
  }
];
