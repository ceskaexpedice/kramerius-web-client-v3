import { handleFacetsWithOperators } from './facet-utils';
import { customDefinedFacetsEnum, facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { SolrOperators } from '../../core/solr/solr-helpers';

describe('handleFacetsWithOperators', () => {

  const whereToSearchCounts = (facets: Record<string, any[]>): Record<string, number> => {
    const items = facets[customDefinedFacetsEnum.whereToSearchModel] ?? [];
    const counts: Record<string, number> = {};
    for (const item of items) {
      counts[item.name] = item.count;
    }
    return counts;
  };

  // Flat Solr facet array: [name, count, name, count, ...]
  const modelFlat = ['monograph', 15, 'periodical', 3, 'page', 2, 'graphic', 1];

  it('computes where-to-search counts from the plain model facet key', () => {
    const facets = handleFacetsWithOperators(
      { [facetKeysEnum.model]: modelFlat },
      { [facetKeysEnum.model]: modelFlat },
      {}
    );

    const counts = whereToSearchCounts(facets);
    expect(counts['titles']).toBe(19); // monograph + periodical + graphic
    expect(counts['page']).toBe(2);
  });

  it('computes where-to-search counts when the model facet arrives under "{!ex=model}model" (active model filter)', () => {
    const tagged = { [`{!ex=${facetKeysEnum.model}}${facetKeysEnum.model}`]: modelFlat };
    const facets = handleFacetsWithOperators(tagged, tagged, { [facetKeysEnum.model]: SolrOperators.or });

    const counts = whereToSearchCounts(facets);
    expect(counts['titles']).toBe(19);
    expect(counts['page']).toBe(2);
  });

  it('still supports the legacy "{!ex=root.model}model" key', () => {
    const tagged = { [`{!ex=${facetKeysEnum.rootModel}}${facetKeysEnum.model}`]: modelFlat };
    const facets = handleFacetsWithOperators(tagged, tagged, {});

    expect(whereToSearchCounts(facets)['titles']).toBe(19);
  });

  it('normalizes a tagged model facet back to the plain "model" key for the doc-type facet', () => {
    const tagged = { [`{!ex=${facetKeysEnum.model}}${facetKeysEnum.model}`]: modelFlat };
    const facets = handleFacetsWithOperators(tagged, tagged, {});

    const modelNames = (facets[facetKeysEnum.model] ?? []).map((item: any) => item.name);
    expect(modelNames).toContain('monograph');
    expect(modelNames).toContain('periodical');
  });

  it('prefers the plain model key over a tagged one when both are present', () => {
    const facets = handleFacetsWithOperators(
      {
        [facetKeysEnum.model]: ['monograph', 5],
        [`{!ex=${facetKeysEnum.model}}${facetKeysEnum.model}`]: modelFlat,
      },
      {
        [facetKeysEnum.model]: ['monograph', 5],
        [`{!ex=${facetKeysEnum.model}}${facetKeysEnum.model}`]: modelFlat,
      },
      {}
    );

    expect(whereToSearchCounts(facets)['titles']).toBe(5);
  });

  it('does not mistake a tagged root.model facet for the model facet', () => {
    const facets = handleFacetsWithOperators(
      {
        [`{!ex=${facetKeysEnum.rootModel}}${facetKeysEnum.rootModel}`]: ['monograph', 7],
        [facetKeysEnum.model]: modelFlat,
      },
      {
        [`{!ex=${facetKeysEnum.rootModel}}${facetKeysEnum.rootModel}`]: ['monograph', 7],
        [facetKeysEnum.model]: modelFlat,
      },
      {}
    );

    expect(whereToSearchCounts(facets)['titles']).toBe(19);
  });
});
