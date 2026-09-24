import { MAP_FACET_FIELDS, withCdkFacetFields } from './facet-fields';
import { facetKeysEnum } from './facets';

/**
 * The "Zdroj" (cdk.collection) filter is a CDK-aggregator feature. It must be
 * requested by every search path that feeds the shared filter sidebar, otherwise
 * the facet comes back empty and app-filter-category hides the whole category —
 * which is how the Maps tab lost the filter while the All tab kept it.
 */
describe('withCdkFacetFields', () => {
  it('appends the source facet on a CDK instance', () => {
    expect(withCdkFacetFields([facetKeysEnum.license], true))
      .toEqual([facetKeysEnum.license, facetKeysEnum.cdkCollection]);
  });

  it('leaves the fields untouched on a standalone library', () => {
    const fields = [facetKeysEnum.license];
    expect(withCdkFacetFields(fields, false)).toEqual(fields);
  });

  it('does not duplicate an already requested source facet', () => {
    const fields = [facetKeysEnum.license, facetKeysEnum.cdkCollection];
    expect(withCdkFacetFields(fields, true)).toEqual(fields);
  });

  it('does not mutate the caller list', () => {
    const fields = [facetKeysEnum.license];
    withCdkFacetFields(fields, true);
    expect(fields).toEqual([facetKeysEnum.license]);
  });

  it('adds the source facet to the map facet fields, so the Maps tab shows Zdroj', () => {
    expect(MAP_FACET_FIELDS).not.toContain(facetKeysEnum.cdkCollection);
    expect(withCdkFacetFields(MAP_FACET_FIELDS, true)).toContain(facetKeysEnum.cdkCollection);
  });
});
