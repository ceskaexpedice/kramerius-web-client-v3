import {ENVIRONMENT} from '../../../app.config';

export enum FilterElementType {
  Autocomplete = 'autocomplete',
  Slider = 'slider',
  Date = 'date',
  DateRange = 'date-range',
  Dropdown = 'dropdown',
  Text = 'text',
  Radio = 'radio',
  Identifier = 'identifier'
}

export enum SolrFacetKey {
  Author = 'author',
  Title = 'title',
  Year = 'year',
  Date = 'date',
  Doctype = 'doctype',
  Language = 'languages',
  Institution = 'institution',
  Publisher = 'publisher',
  PhysicalLocations = 'physical_locations',
  PublishPlace = 'publishPlace',
  Keyword = 'keyword',
  Availability = 'availability',
  License = 'license',
  Genre = 'genre',
  GeoName = 'geoName',
  SearchScope = 'searchScope',
  Fulltext = 'fulltext',
  Identifier = 'identifier',
  SubjectNamesPersonal = 'subject_names_personal',
  SubjectNamesCorporate = 'subject_names_corporate',
  SubjectTemporals = 'subject_temporals'
}

/**
 * Solr field names used in advanced search filters
 * These are the "facet" field names used in the filter definitions
 */
export enum SolrField {
  Title = 'title.search',
  Author = 'authors.facet',
  Fulltext = 'text_ocr'
}

/**
 * Solr search field names used in actual queries
 * Some facet fields get mapped to different search fields for querying
 */
export enum SolrSearchField {
  Title = 'title.search',
  Author = 'authors.search',
  Keywords = 'keywords.search',
  Genres = 'genres.search',
  Fulltext = 'text_ocr'
}

export interface FilterValue {
  elementValue: string;
  solrValue: string;
  caseSensitive?: boolean;
}

export interface AdvancedFilterDefinition {
  key: SolrFacetKey;
  label: string;
  inputType: FilterElementType;
  placeholder?: string;
  dynamicOptions?: boolean;
  elementValue: string;
  solrValue: string;
  isEquals?: boolean; // If true, the filter will be applied as an equals condition
  solrField?: string;
  options?: string[];
  meta?: {
    min?: number;
    max?: number;
    step?: number;
  };
  userRawQueryFormat?: boolean;
  caseSensitive?: boolean; // If true, case-sensitive search will be used (adds .exact suffix to solrField)
  values?: FilterValue[]; // Multiple values for the same filter type
}

export const ADVANCED_FILTERS: AdvancedFilterDefinition[] = [
  { key: SolrFacetKey.Author, label: `filter-${SolrFacetKey.Author}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Author}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: SolrField.Author, userRawQueryFormat: false, isEquals: true },
  { key: SolrFacetKey.Title, label: `filter-${SolrFacetKey.Title}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Title}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: SolrField.Title, userRawQueryFormat: true, isEquals: true },
  { key: SolrFacetKey.Fulltext, label: `filter-${SolrFacetKey.Fulltext}-label`, inputType: FilterElementType.Text, placeholder: `advanced-filter-${SolrFacetKey.Fulltext}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: SolrField.Fulltext, userRawQueryFormat: true, isEquals: true },
  { key: SolrFacetKey.Year, label: `filter-${SolrFacetKey.Year}-label`, inputType: FilterElementType.Slider, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'date.str', meta: {
      min: ENVIRONMENT.dateRangeStartYear,
      max: new Date().getFullYear(),
      step: 1
    }, isEquals: true },
  { key: SolrFacetKey.Date, label: `filter-${SolrFacetKey.Date}-label`, inputType: FilterElementType.Date, elementValue: '', solrValue: '', solrField: 'date.min', isEquals: true },
  { key: SolrFacetKey.Doctype, label: `filter-${SolrFacetKey.Doctype}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'model', isEquals: true },
  { key: SolrFacetKey.Language, label: `filter-${SolrFacetKey.Language}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'languages.facet', isEquals: true },
  // { key: AdvancedFilterKey.Institution, label: `filter-${AdvancedFilterKey.Institution}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'institutions.facet', isEquals: true },
  { key: SolrFacetKey.Publisher, label: `filter-${SolrFacetKey.Publisher}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Publisher}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publishers.facet', isEquals: true },
  { key: SolrFacetKey.PhysicalLocations, label: `filter-${SolrFacetKey.PhysicalLocations}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'physical_locations.facet', isEquals: true },
  { key: SolrFacetKey.PublishPlace, label: `filter-${SolrFacetKey.PublishPlace}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.PublishPlace}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publication_places.facet', isEquals: true },
  { key: SolrFacetKey.Keyword, label: `filter-${SolrFacetKey.Keyword}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Keyword}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'keywords.facet', isEquals: true },
  // { key: AdvancedFilterKey.Availability, label: `advanced-filter-${AdvancedFilterKey.Availability}-label`, inputType: AdvancedFilterType.Radio, dynamicOptions: true, value: '', isEquals: true },
  // { key: AdvancedFilterKey.License, label: `advanced-filter-${AdvancedFilterKey.License}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '', isEquals: true },
  { key: SolrFacetKey.Genre, label: `filter-${SolrFacetKey.Genre}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Genre}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'genres.facet', isEquals: true },
  { key: SolrFacetKey.GeoName, label: `filter-${SolrFacetKey.GeoName}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.GeoName}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'geographic_names.facet', isEquals: true },
  // { key: AdvancedFilterKey.SearchScope, label: `advanced-filter-${AdvancedFilterKey.SearchScope}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '', isEquals: true },
  { key: SolrFacetKey.Identifier, label: `filter-${SolrFacetKey.Identifier}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: 'dc.identifier', isEquals: true },
  { key: SolrFacetKey.SubjectNamesPersonal, label: `filter-${SolrFacetKey.SubjectNamesPersonal}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: `${SolrFacetKey.SubjectNamesPersonal}.facet`, isEquals: true },
  { key: SolrFacetKey.SubjectNamesCorporate, label: `filter-${SolrFacetKey.SubjectNamesCorporate}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: `${SolrFacetKey.SubjectNamesCorporate}.facet`, isEquals: true },
  { key: SolrFacetKey.SubjectTemporals, label: `filter-${SolrFacetKey.SubjectTemporals}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: `${SolrFacetKey.SubjectTemporals}.facet`, isEquals: true }
];

export const DEFAULT_ADVANCED_FILTER: AdvancedFilterDefinition = {...ADVANCED_FILTERS[0]};

// Fields that support case-sensitive search (will have .exact suffix option)
// Includes both the original facet field names and their mapped search field names
export const CASE_SENSITIVE_SUPPORTED_FIELDS: Set<string> = new Set([
  SolrField.Title,         // 'title.search' (facet field)
  SolrSearchField.Title,   // 'title.search' (search field - same as facet)
  SolrField.Author,        // 'authors.facet' (facet field)
  SolrSearchField.Author,  // 'authors.search' (search field - mapped from facet)
  SolrField.Fulltext,      // 'text_ocr' (facet field)
  SolrSearchField.Fulltext // 'text_ocr' (search field - same as facet)
]);

export const FRONTEND_FILTERED_FACET_KEYS: SolrFacetKey[] = [
  SolrFacetKey.Language, SolrFacetKey.Doctype, SolrFacetKey.PhysicalLocations
]

export function isFrontendFilteredFacetKey(key: string): boolean {
  if (!key) return false;
  // if key contains -facet, remove it
  if (key.endsWith('.facet')) {
    key = key.slice(0, -6);
  }
  const mapped = key as SolrFacetKey;
  return FRONTEND_FILTERED_FACET_KEYS.includes(mapped);
}

/**
 * Checks if a field supports case-sensitive search
 * @param fieldName The solr field name (may include .exact suffix)
 * @returns true if the field supports case-sensitive search
 */
export function isFilterWithCaseSensitiveSupport(fieldName: string): boolean {
  if (!fieldName) return false;

  // Remove .exact suffix if present to check the base field
  const baseField = getOriginalSolrKey(fieldName);

  return CASE_SENSITIVE_SUPPORTED_FIELDS.has(baseField);
}

/**
 * Removes the .exact suffix from a field name to get the base field name
 * @param key The field name (e.g., 'title.search.exact')
 * @returns The base field name without .exact suffix (e.g., 'title.search')
 */
export function getOriginalSolrKey(key: string): string {
  return key.replace('.exact', '');
}

/**
 * Checks if a field name has the .exact suffix (indicating case-sensitive search)
 * @param key The field name
 * @returns true if the field name includes '.exact' suffix
 */
export function isExactOn(key: string): boolean {
  return key.includes('.exact');
}

/**
 * @deprecated Use the caseSensitive property on the filter instead
 * Legacy function that modifies the solrField to add/remove .exact suffix
 */
export function changeFieldForExactMatch(filter: AdvancedFilterDefinition, exactMatch = false): AdvancedFilterDefinition {
  const newFilter = {...filter, caseSensitive: exactMatch};
  return newFilter;
}

/**
 * Gets the appropriate Solr field name for a filter, with or without .exact suffix
 * @param filter The filter definition
 * @returns The field name with .exact suffix if caseSensitive is true and field supports it
 */
export function getSolrFieldName(filter: AdvancedFilterDefinition): string {
  if (!filter.solrField) return '';

  const baseField = getOriginalSolrKey(filter.solrField);

  // Add .exact suffix if case-sensitive is enabled and field supports it
  if (filter.caseSensitive && CASE_SENSITIVE_SUPPORTED_FIELDS.has(baseField)) {
    return `${baseField}.exact`;
  }

  return baseField;
}

/**
 * Applies case-sensitive suffix to an array of field names
 * @param fields Array of field names
 * @param caseSensitive Whether to add .exact suffix
 * @returns Array of field names with .exact suffix applied if caseSensitive is true
 */
export function applyCaseSensitiveToFields(fields: string[], caseSensitive: boolean): string[] {
  if (!caseSensitive) return fields;

  return fields.map(field => {
    const baseField = getOriginalSolrKey(field);
    if (CASE_SENSITIVE_SUPPORTED_FIELDS.has(baseField)) {
      return `${baseField}.exact`;
    }
    return field;
  });
}
