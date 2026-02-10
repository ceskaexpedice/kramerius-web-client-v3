import { SolrOperators } from '../../core/solr/solr-helpers';
import { FacetItem } from '../../modules/models/facet-item';
import { SolrResponseParser } from '../../core/solr/solr-response-parser';
import {
  customDefinedFacets,
  customDefinedFacetsEnum, FacetAccessibilityTypes, FacetElementType,
  facetKeysEnum,
} from '../../modules/search-results-page/const/facets';
import { getPublicLicenses, getOnsiteLicenses, getAfterLoginLicenses, getConfiguredLicenses, getConfiguredModels } from '../../core/solr/solr-misc';

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
        if (getPublicLicenses().includes(item.name)) {
          item.iconClass = 'accessibility-public';
        } else if (getOnsiteLicenses().includes(item.name)) {
          item.iconClass = 'accessibility-in_library';
        } else if (getAfterLoginLicenses().includes(item.name)) {
          item.iconClass = 'accessibility-private';
        }
      });
    }

    result[facetKey] = primaryValues;
  }

  // Filter licenses to only include those defined in config
  const configuredLicenses = getConfiguredLicenses();
  if (result[facetKeysEnum.license] && configuredLicenses.length > 0) {
    result[facetKeysEnum.license] = result[facetKeysEnum.license].filter(
      (item: FacetItem) => configuredLicenses.includes(item.name)
    );
  }

  // Filter models to only include those defined in config
  const configuredModels = getConfiguredModels();
  if (configuredModels.length > 0) {
    if (result[facetKeysEnum.model]) {
      result[facetKeysEnum.model] = result[facetKeysEnum.model].filter(
        (item: FacetItem) => configuredModels.includes(item.name)
      );
    }
    if (result[facetKeysEnum.rootModel]) {
      result[facetKeysEnum.rootModel] = result[facetKeysEnum.rootModel].filter(
        (item: FacetItem) => configuredModels.includes(item.name)
      );
    }
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
        const publicLicenses = getPublicLicenses();
        const onsiteLicenses = getOnsiteLicenses();
        const afterLoginLicenses = getAfterLoginLicenses();

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
          // "Public" count from facet.query for public licenses
          if (facetQueries && publicLicenses.length > 0) {
            const licenseClauses = publicLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const publicCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[publicCountKey] ?? 0;
          }
          // Set fq to public licenses for when the filter is applied
          item.fq = publicLicenses;
          item.iconClass = 'accessibility-public';
        } else if (item.key === FacetAccessibilityTypes.onsite) {
          // "Onsite" count from facet.query for onsite licenses
          if (facetQueries && onsiteLicenses.length > 0) {
            const licenseClauses = onsiteLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const onsiteCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[onsiteCountKey] ?? 0;
          }
          // Set fq to onsite licenses for when the filter is applied
          item.fq = onsiteLicenses;
          item.iconClass = 'accessibility-in_library';
        } else if (item.key === FacetAccessibilityTypes.afterLogin) {
          // "After Login" count from facet.query for after-login licenses
          if (facetQueries && afterLoginLicenses.length > 0) {
            const licenseClauses = afterLoginLicenses.map(lic => `${facetKeysEnum.license}:"${lic}"`).join(' OR ');
            const afterLoginCountKey = `{!ex=avail}(${licenseClauses})`;
            count = facetQueries[afterLoginCountKey] ?? 0;
          }
          // Set fq to after-login licenses for when the filter is applied
          item.fq = afterLoginLicenses;
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
