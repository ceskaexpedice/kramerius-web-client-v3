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

/**
 * Appends the CDK "source" facet (cdk.collection) to a facet-field list when the
 * active instance is the CDK aggregator. Shared by the All tab (search effects)
 * and the Maps tab (map search) so the "Zdroj" filter appears in both.
 */
export function withCdkFacetFields(fields: string[], isCdk: boolean): string[] {
  if (!isCdk || fields.includes(facetKeysEnum.cdkCollection)) {
    return fields;
  }
  return [...fields, facetKeysEnum.cdkCollection];
}
