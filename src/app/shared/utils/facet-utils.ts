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
  numFound?: number,
  filters?: any,
  facetQueries?: Record<string, number>
): Record<string, FacetItem[]> {
  const parsedSearchFacets = SolrResponseParser.parseAllFacets(searchFacets);
  const parsedOperatorFacets = SolrResponseParser.parseAllFacets(operatorFacets);

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
        if (item.key === FacetAccessibilityTypes.all) {
          // "All" count from facet.query that excludes availability filter (tagged with avail)
          // This respects user-selected license filters but ignores the availability toggle
          const allCountKey = '{!ex=avail}*:*';
          count = facetQueries?.[allCountKey] ?? numFound ?? 0;
        } else if (item.key === FacetAccessibilityTypes.available) {
          // "Available only" count from facet.query for user's accessible licenses
          // Find the facet.query key that matches the user's licenses query
          if (facetQueries && userLicenses.length > 0) {
            const licenseClauses = userLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const availableCountKey = `(${licenseClauses})`;
            count = facetQueries[availableCountKey] ?? 0;
          }
          // Set fq to user's licenses for when the filter is applied
          item.fq = userLicenses;
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
