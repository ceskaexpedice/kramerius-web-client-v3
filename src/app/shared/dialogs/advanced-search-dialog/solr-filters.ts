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
  { key: SolrFacetKey.Author, label: `filter-${SolrFacetKey.Author}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Author}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'authors.facet', userRawQueryFormat: false },
  { key: SolrFacetKey.Title, label: `filter-${SolrFacetKey.Title}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Title}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'title.search', userRawQueryFormat: true },
  { key: SolrFacetKey.Year, label: `filter-${SolrFacetKey.Year}-label`, inputType: FilterElementType.Slider, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'date.str', meta: {
      min: ENVIRONMENT.dateRangeStartYear,
      max: new Date().getFullYear(),
      step: 1
    } },
  { key: SolrFacetKey.Date, label: `filter-${SolrFacetKey.Date}-label`, inputType: FilterElementType.Date, elementValue: '', solrValue: '', solrField: 'date.min' },
  { key: SolrFacetKey.Doctype, label: `filter-${SolrFacetKey.Doctype}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'model' },
  { key: SolrFacetKey.Language, label: `filter-${SolrFacetKey.Language}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'languages.facet' },
  // { key: AdvancedFilterKey.Institution, label: `filter-${AdvancedFilterKey.Institution}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'institutions.facet' },
  { key: SolrFacetKey.Publisher, label: `filter-${SolrFacetKey.Publisher}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Publisher}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publishers.facet' },
  { key: SolrFacetKey.PhysicalLocations, label: `filter-${SolrFacetKey.PhysicalLocations}-label`, inputType: FilterElementType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'physical_locations.facet' },
  { key: SolrFacetKey.PublishPlace, label: `filter-${SolrFacetKey.PublishPlace}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.PublishPlace}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publication_places.facet' },
  { key: SolrFacetKey.Keyword, label: `filter-${SolrFacetKey.Keyword}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Keyword}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'keywords.facet' },
  // { key: AdvancedFilterKey.Availability, label: `advanced-filter-${AdvancedFilterKey.Availability}-label`, inputType: AdvancedFilterType.Radio, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.License, label: `advanced-filter-${AdvancedFilterKey.License}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: SolrFacetKey.Genre, label: `filter-${SolrFacetKey.Genre}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.Genre}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'genres.facet' },
  { key: SolrFacetKey.GeoName, label: `filter-${SolrFacetKey.GeoName}-label`, inputType: FilterElementType.Autocomplete, placeholder: `advanced-filter-${SolrFacetKey.GeoName}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'geographic_names.facet' },
  // { key: AdvancedFilterKey.SearchScope, label: `advanced-filter-${AdvancedFilterKey.SearchScope}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.Fulltext, label: `advanced-filter-${AdvancedFilterKey.Fulltext}-label`, inputType: AdvancedFilterType.Text, value: '' },
  { key: SolrFacetKey.Identifier, label: `filter-${SolrFacetKey.Identifier}-label`, inputType: FilterElementType.Autocomplete, elementValue: '', solrValue: '', solrField: 'dc.identifier' }
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
