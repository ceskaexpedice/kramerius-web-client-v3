export enum AdvancedFilterType {
  Autocomplete = 'autocomplete',
  Slider = 'slider',
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

export class AdvancedFilterDefinition {
  key: AdvancedFilterKey = AdvancedFilterKey.Author;
  label: string = AdvancedFilterKey.Author;
  inputType: AdvancedFilterType = AdvancedFilterType.Autocomplete;
  dynamicOptions?: boolean;
  value: string = '';
  options?: string[];
}

export const ADVANCED_FILTERS: AdvancedFilterDefinition[] = [
  { key: AdvancedFilterKey.Author, label: `advanced-filter-${AdvancedFilterKey.Author}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Title, label: `advanced-filter-${AdvancedFilterKey.Title}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Year, label: `advanced-filter-${AdvancedFilterKey.Year}-label`, inputType: AdvancedFilterType.Slider, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Date, label: `advanced-filter-${AdvancedFilterKey.Date}-label`, inputType: AdvancedFilterType.DateRange, value: '' },
  { key: AdvancedFilterKey.Doctype, label: `advanced-filter-${AdvancedFilterKey.Doctype}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Language, label: `advanced-filter-${AdvancedFilterKey.Language}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Institution, label: `advanced-filter-${AdvancedFilterKey.Institution}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Publisher, label: `advanced-filter-${AdvancedFilterKey.Publisher}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Location, label: `advanced-filter-${AdvancedFilterKey.Location}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.PublishPlace, label: `advanced-filter-${AdvancedFilterKey.PublishPlace}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Keyword, label: `advanced-filter-${AdvancedFilterKey.Keyword}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Availability, label: `advanced-filter-${AdvancedFilterKey.Availability}-label`, inputType: AdvancedFilterType.Radio, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.License, label: `advanced-filter-${AdvancedFilterKey.License}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Genre, label: `advanced-filter-${AdvancedFilterKey.Genre}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.GeoName, label: `advanced-filter-${AdvancedFilterKey.GeoName}-label`, inputType: AdvancedFilterType.Autocomplete, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.SearchScope, label: `advanced-filter-${AdvancedFilterKey.SearchScope}-label`, inputType: AdvancedFilterType.Dropdown, dynamicOptions: true, value: '' },
  { key: AdvancedFilterKey.Fulltext, label: `advanced-filter-${AdvancedFilterKey.Fulltext}-label`, inputType: AdvancedFilterType.Text, value: '' },
  { key: AdvancedFilterKey.Identifier, label: `advanced-filter-${AdvancedFilterKey.Identifier}-label`, inputType: AdvancedFilterType.Identifier, value: '' }
];
