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
  Identifier = 'identifier'
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
}

export const ADVANCED_FILTERS: AdvancedFilterDefinition[] = [
  { key: SolrFacetKey.Author, label: `filter-${SolrFacetKey.Author}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Author}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'authors.facet', userRawQueryFormat: false, isEquals: true },
  { key: SolrFacetKey.Title, label: `filter-${SolrFacetKey.Title}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Title}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'title.search', userRawQueryFormat: true, isEquals: true },
  { key: SolrFacetKey.Fulltext, label: `filter-${SolrFacetKey.Fulltext}-label`, inputType: FilterElementType.Text, placeholder: `advanced-filter-${SolrFacetKey.Fulltext}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'text_ocr', userRawQueryFormat: true, isEquals: true },
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
  { key: SolrFacetKey.Identifier, label: `filter-${SolrFacetKey.Identifier}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: 'dc.identifier', isEquals: true }
];

export const DEFAULT_ADVANCED_FILTER: AdvancedFilterDefinition = {...ADVANCED_FILTERS[0]};

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

export function isFulltextFilter(key: string) {
  if (key.includes('text_ocr')) {
    return true;
  }
  return false;
}

// if we change fulltext to match case, we need to change solrField to text_ocr.exact
export function changeFulltextFieldForExactMatch(filter: AdvancedFilterDefinition, exactMatch = false): AdvancedFilterDefinition {
  if (filter.key === SolrFacetKey.Fulltext) {
    const newFilter = {...filter};
    if (exactMatch) {
      newFilter.solrField = 'text_ocr.exact';
    } else {
      newFilter.solrField = 'text_ocr';
    }
    return newFilter;
  }
  return filter;
}
