import {SolrOperators} from '../../core/solr/solr-helpers';
import {FacetItem} from '../../modules/models/facet-item';
import {SolrResponseParser} from '../../core/solr/solr-response-parser';
import {
  customDefinedFacets,
  customDefinedFacetsEnum, FacetAccessibilityTypes, FacetElementType,
  facetKeysEnum,
} from '../../modules/search-results-page/const/facets';

export function handleFacetsWithOperators(
  searchFacets: Record<string, any[]>,
  operatorFacets: Record<string, any[]>,
  facetOperators: Record<string, SolrOperators>,
  unfilteredFacets: Record<string, any[]> = {},
  userLicenses: string[] = [],
  numFound?: number
): Record<string, FacetItem[]> {
  const parsedSearchFacets = SolrResponseParser.parseAllFacets(searchFacets);
  const parsedOperatorFacets = SolrResponseParser.parseAllFacets(operatorFacets);
  const parsedUnfilteredFacets = SolrResponseParser.parseAllFacets(unfilteredFacets);

  const result: Record<string, FacetItem[]> = {};
  const allFacetKeys = new Set([
    ...Object.keys(parsedSearchFacets),
    ...Object.keys(parsedOperatorFacets),
  ]);

  for (const facetKey of allFacetKeys) {
    const operator = facetOperators[facetKey] ?? SolrOperators.or;
    const primaryValues = operator === SolrOperators.and
      ? parsedSearchFacets[facetKey] || []
      : parsedOperatorFacets[facetKey] || [];
    const fallbackValues = operator === SolrOperators.and
      ? parsedOperatorFacets[facetKey] || []
      : parsedSearchFacets[facetKey] || [];

    const valueMap = new Map(primaryValues.map(item => [item.name, item]));
    fallbackValues.forEach(item => {
      if (!valueMap.has(item.name)) {
        primaryValues.push(item);
      }
    });

    result[facetKey] = primaryValues;
  }

  for (const custom of customDefinedFacets) {
    const enrichedItems: FacetItem[] = custom.data.map((item: any) => {
      const fqList = Array.isArray(item.fq) ? item.fq : [item.fq];
      let count = 0;
      
      // Only calculate count for custom facets that have a corresponding Solr facet
      if (custom.solrFacetKeyForCount) {
        count = fqList.reduce((sum: number, fq: any) => {
          return sum + (result[custom.solrFacetKeyForCount]?.find((f: any) => f.name === fq)?.count || 0);
        }, 0);
      }

      if (custom.facetKey === customDefinedFacetsEnum.accessibility) {
        const licenses = result[facetKeysEnum.license] || [];
        const modelsUnfiltered = parsedUnfilteredFacets[facetKeysEnum.model] || [];

        if (item.key === FacetAccessibilityTypes.all) {
          count = modelsUnfiltered.reduce((sum, model) => sum + model.count, 0);

          // if we dont have any modelsUnfiltered, we can use the count from the licenses
          if (modelsUnfiltered.length === 0) {
            count = licenses.reduce((sum, lic) => sum + lic.count, 0);

            // if still no count and numFound is provided, use numFound as final fallback
            if (count === 0 && numFound !== undefined) {
              count = numFound;
            }
          }
        } else if (item.key === FacetAccessibilityTypes.available) {
          item.fq = userLicenses;
          count = userLicenses.reduce((sum, lic) => {
            return sum + (licenses.find(f => f.name === lic)?.count || 0);
          }, 0);
        }

      }

      return {
        ...item,
        count,
        type: item.type ?? FacetElementType.checkbox,
      };
    });

    result[custom.title] = enrichedItems;
  }

  return result;
}
