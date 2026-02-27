import { SolrSearchField } from '../../../shared/dialogs/advanced-search-dialog/solr-filters';
import { getConfiguredModels } from '../../../core/solr/solr-misc';

export enum FacetElementType {
  checkbox = 'checkbox',
  radio = 'radio',
  range = 'range',
  dateRange = 'dateRange',
  yearRange = 'yearRange',
}

export enum FacetAccessibilityTypes {
  all = 'all',
  available = 'available',
  public = 'public',
  onsite = 'onsite',
  afterLogin = 'afterLogin'
}


export const facetKeysEnum = {
  accessibility: 'accessibility',
  license: 'licenses.facet',
  model: 'model',
  rootModel: 'root.model',
  authors: 'authors.facet',
  languages: 'languages.facet',
  genres: 'genres.facet',
  keywords: 'keywords.facet',
  geographic_names: 'geographic_names.facet',
  publishers: 'publishers.facet',
  publication_places: 'publication_places.facet',
  physical_locations: 'physical_locations.facet',
  subjectNamesPersonal: 'subject_names_personal.facet',
  subjectNamesCorporate: 'subject_names_corporate.facet',
  subjectTemporals: 'subject_temporals.facet'
}

export const facetKeys: string[] = [
  facetKeysEnum.license,
  facetKeysEnum.model,
  facetKeysEnum.authors,
  facetKeysEnum.languages,
  facetKeysEnum.genres,
  facetKeysEnum.keywords,
  facetKeysEnum.geographic_names,
  facetKeysEnum.publishers,
  facetKeysEnum.publication_places,
  facetKeysEnum.physical_locations,
  facetKeysEnum.subjectNamesPersonal,
  facetKeysEnum.subjectNamesCorporate,
  facetKeysEnum.subjectTemporals
];

export enum customDefinedFacetsEnum {
  accessibility = 'custom-accessibility',
  model = 'custom-root-model',
  whereToSearchModel = 'custom-where-to-search.model',
  dateRange = 'custom-date-range',
  yearRange = 'custom-year-range',
}

export const customDefinedFacetsKeys: string[] = [
  customDefinedFacetsEnum.accessibility,
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel,
  customDefinedFacetsEnum.dateRange,
  customDefinedFacetsEnum.yearRange
]

export const facetKeysInfinityCount: string[] = [
  facetKeysEnum.accessibility,
  facetKeysEnum.license,
  facetKeysEnum.model,
  customDefinedFacetsEnum.accessibility,
  customDefinedFacetsEnum.model,
  customDefinedFacetsEnum.whereToSearchModel,
  customDefinedFacetsEnum.dateRange,
  customDefinedFacetsEnum.yearRange
]

// Child/structural models that are excluded from root-model facet
const childModels = ['monographunit', 'periodicalvolume', 'periodicalitem', 'article', 'page', 'supplement'];

// Default root models (used as fallback if config not loaded yet)
const defaultRootModels = ['periodical', 'monograph', 'map', 'graphic', 'archive', 'manuscript', 'soundrecording', 'sheetmusic', 'convolute', 'collection'];

// Default title models for "where to search" (root models + monographunit)
const defaultTitleModels = [...defaultRootModels, 'monographunit'];

function getRootModels(): string[] {
  const configured = getConfiguredModels();
  if (configured.length === 0) return defaultRootModels;
  return configured.filter(m => !childModels.includes(m));
}

function getTitleModels(): string[] {
  const configured = getConfiguredModels();
  if (configured.length === 0) return defaultTitleModels;
  return configured.filter(m => m !== 'periodicalvolume' && m !== 'periodicalitem' && m !== 'article' && m !== 'page' && m !== 'supplement');
}

function hasConfiguredModel(model: string): boolean {
  const configured = getConfiguredModels();
  if (configured.length === 0) return true; // fallback: show all
  return configured.includes(model);
}

function getWhereToSearchData(): any[] {
  const data: any[] = [
    { key: 'titles', fq: getTitleModels(), name: 'titles', count: 0 },
    { key: 'pages', fq: 'page', name: 'page', count: 0 },
  ];

  // periodicalvolume/periodicalitem only if periodical is configured
  if (hasConfiguredModel('periodical')) {
    data.push({ key: 'periodicalvolume', fq: 'periodicalvolume', name: 'periodicalvolume', count: 0 });
    data.push({ key: 'periodicalitem', fq: 'periodicalitem', name: 'periodicalitem', count: 0 });
  }

  if (hasConfiguredModel('article')) {
    data.push({ key: 'articles', fq: 'article', name: 'article', count: 0 });
  }

  if (hasConfiguredModel('supplement')) {
    data.push({ key: 'attachments', fq: 'supplement', name: 'supplement', count: 0 });
  }

  return data;
}

export function getCustomDefinedFacets() {
  return [
    {
      facetKey: customDefinedFacetsEnum.accessibility,
      title: customDefinedFacetsEnum.accessibility,
      solrFacetKey: facetKeysEnum.license,
      solrFacetKeyForCount: facetKeysEnum.license,
      type: FacetElementType.radio,
      data: [
        {
          key: FacetAccessibilityTypes.all,
          fq: null,
          name: `${FacetAccessibilityTypes.all}`,
          label: 'custom-accessibility--all',
          count: 0,
          type: FacetElementType.radio,
          icons: [
            { icon: 'icon-in-house', iconClass: 'accessibility-in_library' },
            { icon: 'icon-locked', iconClass: 'accessibility-private' },
            { icon: 'icon-locked', iconClass: 'accessibility-public' },
            { icon: 'icon-eye-public', iconClass: 'accessibility-public' },
          ],
          tooltipIcon: 'icon-question',
          tooltipText: 'custom-accessibility--all-tooltip',
        },
        {
          key: FacetAccessibilityTypes.available,
          fq: [],
          name: `${FacetAccessibilityTypes.available}`,
          label: 'custom-accessibility--available',
          count: 0,
          type: FacetElementType.radio,
          icons: [
            { icon: 'icon-locked', iconClass: 'accessibility-public' },
            { icon: 'icon-eye-public', iconClass: 'accessibility-public' },
          ],
          tooltipIcon: 'icon-question',
          tooltipText: 'custom-accessibility--available-tooltip',
        },
        {
          key: FacetAccessibilityTypes.public,
          fq: [],
          name: `${FacetAccessibilityTypes.public}`,
          label: 'custom-accessibility--public',
          icon: 'icon-eye-public',
          iconClass: 'accessibility-public',
          count: 0,
          type: FacetElementType.radio
        },
        {
          key: FacetAccessibilityTypes.afterLogin,
          fq: [],
          name: `${FacetAccessibilityTypes.afterLogin}`,
          label: 'custom-accessibility--afterLogin',
          icon: 'icon-locked',
          iconClass: 'accessibility-private',
          count: 0,
          type: FacetElementType.radio,
          tooltipIcon: 'icon-question',
          tooltipText: 'custom-accessibility--afterLogin-tooltip',
        },
        {
          key: FacetAccessibilityTypes.onsite,
          fq: [],
          name: `${FacetAccessibilityTypes.onsite}`,
          label: 'custom-accessibility--onsite',
          icon: 'icon-in-house',
          iconClass: 'accessibility-in_library',
          count: 0,
          type: FacetElementType.radio
        }
      ]
    },
    {
      facetKey: customDefinedFacetsEnum.model,
      title: customDefinedFacetsEnum.model,
      solrFacetKey: facetKeysEnum.rootModel,
      solrFacetKeyForCount: facetKeysEnum.model,
      data: getRootModels().map(model => ({
        key: model,
        fq: [model],
        name: model,
        count: 0
      }))
    },
    {
      facetKey: customDefinedFacetsEnum.whereToSearchModel,
      title: customDefinedFacetsEnum.whereToSearchModel,
      solrFacetKey: facetKeysEnum.model,
      solrFacetKeyForCount: facetKeysEnum.model,
      data: getWhereToSearchData()
    },
    {
      facetKey: customDefinedFacetsEnum.dateRange,
      title: 'date',
      type: FacetElementType.dateRange,
      data: []
    },
    {
      facetKey: customDefinedFacetsEnum.yearRange,
      title: 'year-range',
      type: FacetElementType.yearRange,
      data: []
    }
  ];
}

/**
 * Mapper for facets to search fields. Maps facet field keys to search field keys.
 * Uses SolrSearchField enum to ensure consistency and avoid magic strings.
 * For example: 'keywords.facet' maps to ['keywords.search'] for querying
 */
export const facetToSearchFieldMapper: { [key: string]: string[] } = {
  [facetKeysEnum.authors]: [SolrSearchField.Author],      // 'authors.facet' → ['authors.search']
  [facetKeysEnum.keywords]: [SolrSearchField.Keywords],   // 'keywords.facet' → ['keywords.search']
  [facetKeysEnum.genres]: [SolrSearchField.Genres]        // 'genres.facet' → ['genres.search']
};

/**
 * Mapper for advanced search fields. Maps solr field keys to their corresponding search field keys.
 * This allows different mappings for advanced search compared to regular facet filtering.
 * Uses SolrSearchField enum to ensure consistency and avoid magic strings.
 * For example: 'authors.facet' maps to ['authors.search'] for querying
 */
export const advancedSearchFieldMapper: { [key: string]: string[] } = {
  [facetKeysEnum.authors]: [SolrSearchField.Author],      // 'authors.facet' → ['authors.search']
  [facetKeysEnum.keywords]: [SolrSearchField.Keywords],   // 'keywords.facet' → ['keywords.search']
  [SolrSearchField.Title]: [SolrSearchField.Title]        // 'title.search' → ['title.search'] (no change)
};

/**
 * Maps a solr field to its corresponding search fields for advanced search.
 * @param solrField - The solr field key to map
 * @returns Array of mapped search field keys, or the original field if no mapping exists
 */
export function mapAdvancedSearchField(solrField: string): string[] {
  if (advancedSearchFieldMapper[solrField]) {
    return advancedSearchFieldMapper[solrField];
  }
  return [solrField];
}

/**
 * Maps filter strings from facet keys to search field keys.
 * For example: 'keywords.facet:value' becomes ['keywords.search:value', 'keywords_exact.search:value']
 * @param filters - Array of filter strings in format 'facetKey:value'
 * @returns Array of mapped filter strings
 */
export function mapFacetsToSearchFields(filters: string[]): string[] {
  const mappedFilters: string[] = [];

  for (const filter of filters) {
    const colonIndex = filter.indexOf(':');
    if (colonIndex === -1) {
      // No colon found, keep filter as is
      mappedFilters.push(filter);
      continue;
    }

    const facetKey = filter.substring(0, colonIndex);
    const value = filter.substring(colonIndex + 1);

    // Check if this facet key has a mapping
    if (facetToSearchFieldMapper[facetKey]) {
      // Map to multiple search fields
      for (const searchField of facetToSearchFieldMapper[facetKey]) {
        mappedFilters.push(`${searchField}:${value}`);
      }
    } else {
      // No mapping found, keep original filter
      mappedFilters.push(filter);
    }
  }

  return mappedFilters;
}
