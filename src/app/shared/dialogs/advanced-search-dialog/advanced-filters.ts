export enum AdvancedFilterType {
  Autocomplete = 'autocomplete',
  Slider = 'slider',
  Date = 'date',
  DateRange = 'date-range',
  Dropdown = 'dropdown',
  Text = 'text',
  Radio = 'radio',
  Identifier = 'identifier'
}

export enum AdvancedFilterKey {
  Author = 'author',
  Title = 'title',
  Year = 'year',
  Date = 'date',
  Doctype = 'doctype',
  Language = 'language',
  Institution = 'institution',
  Publisher = 'publisher',
  Location = 'location',
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
  key: AdvancedFilterKey;
  label: string;
  inputType: AdvancedFilterType;
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
  { key: AdvancedFilterKey.Author, label: `advanced-filter-${AdvancedFilterKey.Author}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'authors.search', userRawQueryFormat: true },
  { key: AdvancedFilterKey.Title, label: `advanced-filter-${AdvancedFilterKey.Title}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'title.search', userRawQueryFormat: true },
  { key: AdvancedFilterKey.Year, label: `advanced-filter-${AdvancedFilterKey.Year}-label`, inputType: AdvancedFilterType.Slider, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'date.str', meta: {
      min: 0,
      max: new Date().getFullYear(),
      step: 1
    } },
  { key: AdvancedFilterKey.Date, label: `advanced-filter-${AdvancedFilterKey.Date}-label`, inputType: AdvancedFilterType.Date, elementValue: '', solrValue: '', solrField: 'date.min' },
  { key: AdvancedFilterKey.Doctype, label: `advanced-filter-${AdvancedFilterKey.Doctype}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'model' },
  { key: AdvancedFilterKey.Language, label: `advanced-filter-${AdvancedFilterKey.Language}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'languages.facet' },
  // { key: AdvancedFilterKey.Institution, label: `advanced-filter-${AdvancedFilterKey.Institution}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'institutions.facet' },
  { key: AdvancedFilterKey.Publisher, label: `advanced-filter-${AdvancedFilterKey.Publisher}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publishers.facet' },
  { key: AdvancedFilterKey.Location, label: `advanced-filter-${AdvancedFilterKey.Location}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'physical_locations.facet' },
  { key: AdvancedFilterKey.PublishPlace, label: `advanced-filter-${AdvancedFilterKey.PublishPlace}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publication_places.facet' },
  { key: AdvancedFilterKey.Keyword, label: `advanced-filter-${AdvancedFilterKey.Keyword}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'keywords.facet' },
  // { key: AdvancedFilterKey.Availability, label: `advanced-filter-${AdvancedFilterKey.Availability}-label`, inputType: AdvancedFilterType.Radio, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.License, label: `advanced-filter-${AdvancedFilterKey.License}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Genre, label: `advanced-filter-${AdvancedFilterKey.Genre}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'genres.facet' },
  { key: AdvancedFilterKey.GeoName, label: `advanced-filter-${AdvancedFilterKey.GeoName}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'geographic_names.facet' },
  // { key: AdvancedFilterKey.SearchScope, label: `advanced-filter-${AdvancedFilterKey.SearchScope}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.Fulltext, label: `advanced-filter-${AdvancedFilterKey.Fulltext}-label`, inputType: AdvancedFilterType.Text, value: '' },
  { key: AdvancedFilterKey.Identifier, label: `advanced-filter-${AdvancedFilterKey.Identifier}-label`, inputType: AdvancedFilterType.Identifier, elementValue: '', solrValue: '', solrField: 'dc.identifier' }
];

export const DEFAULT_ADVANCED_FILTER: AdvancedFilterDefinition = {...ADVANCED_FILTERS[0]};
