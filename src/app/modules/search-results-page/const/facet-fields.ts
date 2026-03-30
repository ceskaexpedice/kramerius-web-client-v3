import {facetKeys, facetKeysEnum} from './facets';

export const DEFAULT_FACET_FIELDS = facetKeys;

export const DEFAULT_PERIODICAL_FACET_FIELDS = [
  facetKeysEnum.license
];

export const MAP_FACET_FIELDS = [
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
];
