import { SolrOperators } from '../../core/solr/solr-helpers';
import { FacetItem } from '../../modules/models/facet-item';
import { SolrResponseParser } from '../../core/solr/solr-response-parser';
import {
  customDefinedFacets,
  customDefinedFacetsEnum, FacetAccessibilityTypes, FacetElementType,
  facetKeysEnum,
} from '../../modules/search-results-page/const/facets';
import { PUBLIC_LICENSES, ONSITE_LICENSES, AFTER_LOGIN_LICENSES } from '../../core/solr/solr-misc';

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

    if (facetKey === facetKeysEnum.license) {
      primaryValues.forEach(item => {
        if (PUBLIC_LICENSES.includes(item.name)) {
          item.iconClass = 'accessibility-public';
        } else if (ONSITE_LICENSES.includes(item.name)) {
          item.iconClass = 'accessibility-in_library';
        } else if (AFTER_LOGIN_LICENSES.includes(item.name)) {
          item.iconClass = 'accessibility-private';
        }
      });
    }

    result[facetKey] = primaryValues;
  }

  // Extract active root.model filters from the filters array (these are external filters from custom-root-model)
  const activeRootModelFilters: string[] = [];
  if (filters && Array.isArray(filters)) {
    filters.forEach((filter: string) => {
      if (filter.startsWith(`${facetKeysEnum.rootModel}:`)) {
        const value = filter.split(':')[1]?.replace(/"/g, '');
        if (value) {
          activeRootModelFilters.push(value);
        }
      }
    });
  }

  for (const custom of customDefinedFacets) {
    const enrichedItems: FacetItem[] = custom.data.map((item: any) => {
      const fqList = Array.isArray(item.fq) ? item.fq : [item.fq];
      let count = 0;

      // Only calculate count for custom facets that have a corresponding Solr facet
      if (custom.solrFacetKeyForCount) {
        // For whereToSearchModel facet, check if there are active root.model filters (from custom-root-model)
        if (custom.facetKey === customDefinedFacetsEnum.whereToSearchModel && activeRootModelFilters.length > 0) {
          // Only sum counts for models that are both in the item's fq list AND in root.model filters
          const relevantModels = fqList.filter((fq: string) => activeRootModelFilters.includes(fq));
          if (relevantModels.length > 0) {
            count = relevantModels.reduce((sum: number, fq: any) => {
              return sum + (result[custom.solrFacetKeyForCount]?.find((f: any) => f.name === fq)?.count || 0);
            }, 0);
          }
          // If no overlap between item's fq and root.model filters, count stays 0
        } else {
          // Default behavior: sum all models in fqList
          count = fqList.reduce((sum: number, fq: any) => {
            return sum + (result[custom.solrFacetKeyForCount]?.find((f: any) => f.name === fq)?.count || 0);
          }, 0);
        }
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
            const availableCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[availableCountKey] ?? 0;
          }
          // Set fq to user's licenses for when the filter is applied
          item.fq = userLicenses;
        } else if (item.key === FacetAccessibilityTypes.public) {
          // "Public" count from facet.query for PUBLIC_LICENSES
          if (facetQueries && PUBLIC_LICENSES.length > 0) {
            const licenseClauses = PUBLIC_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const publicCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[publicCountKey] ?? 0;
          }
          // Set fq to PUBLIC_LICENSES for when the filter is applied
          item.fq = PUBLIC_LICENSES;
          item.iconClass = 'accessibility-public';
        } else if (item.key === FacetAccessibilityTypes.onsite) {
          // "Onsite" count from facet.query for ONSITE_LICENSES
          if (facetQueries && ONSITE_LICENSES.length > 0) {
            const licenseClauses = ONSITE_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const onsiteCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[onsiteCountKey] ?? 0;
          }
          // Set fq to ONSITE_LICENSES for when the filter is applied
          item.fq = ONSITE_LICENSES;
          item.iconClass = 'accessibility-in_library';
        } else if (item.key === FacetAccessibilityTypes.afterLogin) {
          // "After Login" count from facet.query for AFTER_LOGIN_LICENSES
          if (facetQueries && AFTER_LOGIN_LICENSES.length > 0) {
            const licenseClauses = AFTER_LOGIN_LICENSES.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const afterLoginCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[afterLoginCountKey] ?? 0;
          }
          // Set fq to AFTER_LOGIN_LICENSES for when the filter is applied
          item.fq = AFTER_LOGIN_LICENSES;
          item.iconClass = 'accessibility-private';
        }
      }

      return {
        ...item,
        count,
        type: item.type ?? FacetElementType.checkbox,
        iconClass: item.iconClass
      };
    });

    result[custom.title] = enrichedItems;
  }

  return result;
}
