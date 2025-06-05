import {ENVIRONMENT} from '../../../app.config';

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
  { key: AdvancedFilterKey.Author, label: `filter-${AdvancedFilterKey.Author}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.Author}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'authors.facet', userRawQueryFormat: false },
  { key: AdvancedFilterKey.Title, label: `filter-${AdvancedFilterKey.Title}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.Title}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'title.search', userRawQueryFormat: true },
  { key: AdvancedFilterKey.Year, label: `filter-${AdvancedFilterKey.Year}-label`, inputType: AdvancedFilterType.Slider, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'date.str', meta: {
      min: ENVIRONMENT.dateRangeStartYear,
      max: new Date().getFullYear(),
      step: 1
    } },
  { key: AdvancedFilterKey.Date, label: `filter-${AdvancedFilterKey.Date}-label`, inputType: AdvancedFilterType.Date, elementValue: '', solrValue: '', solrField: 'date.min' },
  { key: AdvancedFilterKey.Doctype, label: `filter-${AdvancedFilterKey.Doctype}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'model' },
  { key: AdvancedFilterKey.Language, label: `filter-${AdvancedFilterKey.Language}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'languages.facet' },
  // { key: AdvancedFilterKey.Institution, label: `filter-${AdvancedFilterKey.Institution}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'institutions.facet' },
  { key: AdvancedFilterKey.Publisher, label: `filter-${AdvancedFilterKey.Publisher}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.Publisher}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publishers.facet' },
  { key: AdvancedFilterKey.Location, label: `filter-${AdvancedFilterKey.Location}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'physical_locations.facet' },
  { key: AdvancedFilterKey.PublishPlace, label: `filter-${AdvancedFilterKey.PublishPlace}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.PublishPlace}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'publication_places.facet' },
  { key: AdvancedFilterKey.Keyword, label: `filter-${AdvancedFilterKey.Keyword}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.Keyword}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'keywords.facet' },
  // { key: AdvancedFilterKey.Availability, label: `advanced-filter-${AdvancedFilterKey.Availability}-label`, inputType: AdvancedFilterType.Radio, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.License, label: `advanced-filter-${AdvancedFilterKey.License}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Genre, label: `filter-${AdvancedFilterKey.Genre}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.Genre}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'genres.facet' },
  { key: AdvancedFilterKey.GeoName, label: `filter-${AdvancedFilterKey.GeoName}-label`, inputType: AdvancedFilterType.Autocomplete, placeholder: `advanced-filter-${AdvancedFilterKey.GeoName}-placeholder`, dynamicOptions: true, elementValue: '', solrValue: '', solrField: 'geographic_names.facet' },
  // { key: AdvancedFilterKey.SearchScope, label: `advanced-filter-${AdvancedFilterKey.SearchScope}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  // { key: AdvancedFilterKey.Fulltext, label: `advanced-filter-${AdvancedFilterKey.Fulltext}-label`, inputType: AdvancedFilterType.Text, value: '' },
  { key: AdvancedFilterKey.Identifier, label: `filter-${AdvancedFilterKey.Identifier}-label`, inputType: AdvancedFilterType.Autocomplete, elementValue: '', solrValue: '', solrField: 'dc.identifier' }
];

export const DEFAULT_ADVANCED_FILTER: AdvancedFilterDefinition = {...ADVANCED_FILTERS[0]};
