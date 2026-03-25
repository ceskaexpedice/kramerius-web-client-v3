// Base fields that are always returned
export const SEARCH_RETURN_FIELDS = [
  'pid', 'accessibility', 'model', 'authors', 'titles.search',
  'title.search', 'root.title', 'date.str', 'title.search_*',
  'collection.desc', 'collection.desc_*', 'licenses',
  'contains_licenses', 'licenses_of_ancestors', 'count_page', 'languages.facet', 'root.pid', 'licenses.facet', 'own_parent.pid',
  'date_range_start.year', 'date_range_start.month', 'date_range_start.day', 'count_monograph_unit', 'root.model'
];

// Optional fields mapped to column IDs
export const OPTIONAL_SOLR_FIELDS: Record<string, string[]> = {
  'publicationPlaces': ['publication_places.search'],
  'keywords': ['keywords.search'],
  'mdt': ['mdt'],
  'shelfLocators': ['shelf_locators'],
  'idUrnnbn': ['id_urnnbn'],
  'idOther': ['id_other'],
  'physicalLocations': ['physical_locations.facet'],
  'genres': ['genres.search']
};
