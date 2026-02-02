import { Injectable, inject } from '@angular/core';
import {
    ActivatedRouteSnapshot,
    CanActivateFn,
    Router,
    RouterStateSnapshot,
    UrlTree
} from '@angular/router';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { facetKeysEnum } from '../../modules/search-results-page/const/facets';
import { SolrSortFields } from '../solr/solr-helpers';

@Injectable({
    providedIn: 'root'
})
class LegacyRouteResolverService {
    private router = inject(Router);

    // Map legacy facet keys to new facet keys
    private readonly FACET_MAPPING: { [key: string]: string } = {
        'keywords': facetKeysEnum.keywords,
        'authors': facetKeysEnum.authors,
        'languages': facetKeysEnum.languages,
        'locations': facetKeysEnum.physical_locations,
        'publishers': facetKeysEnum.publishers,
        'places': facetKeysEnum.publication_places,
        'genres': facetKeysEnum.genres,
        'doctypes': facetKeysEnum.model,
        'collections': 'collection',
        'subject_names_personal': facetKeysEnum.subjectNamesPersonal,
        'subject_names_corporate': facetKeysEnum.subjectNamesCorporate,
        'subject_temporals': facetKeysEnum.subjectTemporals
    };

    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): UrlTree | boolean {
        const queryParams = { ...route.queryParams };
        let hasChanges = false;
        let targetPath = state.url.split('?')[0];

        // 1. Handle /browse route -> Redirect to search
        if (targetPath.includes('/browse')) {
            targetPath = '/' + APP_ROUTES_ENUM.SEARCH_RESULTS;
            hasChanges = true;
            // Map 'bq' to 'query' if present
            if (queryParams['bq']) {
                queryParams['query'] = queryParams['bq'];
                delete queryParams['bq'];
            }
            // Clean up other browse specific params if needed
            if (queryParams['category']) delete queryParams['category'];
        }
        // Handle /collection/:uuid -> Redirect to /collection/:uuid (usually handled by route config, but let's check path)
        else if (targetPath.includes('/collection/')) {
            // Should be fine, but check params
        }

        // 2. Map 'q' -> 'query'
        if (queryParams['q']) {
            queryParams['query'] = queryParams['q'];
            delete queryParams['q'];
            hasChanges = true;
        }

        // 3. Map 'rows' -> 'pageSize'
        if (queryParams['rows']) {
            queryParams['pageSize'] = queryParams['rows'];
            delete queryParams['rows'];
            hasChanges = true;
        }

        // 4. Map 'sort'
        if (queryParams['sort']) {
            const sortVal = queryParams['sort'].toLowerCase();
            delete queryParams['sort'];
            hasChanges = true;

            switch (sortVal) {
                case 'newest':
                    queryParams['sortBy'] = SolrSortFields.createdAt; // or date.min
                    queryParams['sortDirection'] = 'desc';
                    break;
                case 'oldest':
                    queryParams['sortBy'] = SolrSortFields.createdAt;
                    queryParams['sortDirection'] = 'asc';
                    break;
                case 'relevance':
                    queryParams['sortBy'] = SolrSortFields.relevance;
                    queryParams['sortDirection'] = 'desc';
                    break;
                case 'title':
                case 'alphabetical':
                    queryParams['sortBy'] = SolrSortFields.title;
                    queryParams['sortDirection'] = 'asc';
                    break;
                default:
                    // Try to handle raw values if they match solr fields
                    if (sortVal.includes('date')) {
                        queryParams['sortBy'] = SolrSortFields.createdAt;
                        queryParams['sortDirection'] = 'desc';
                    }
                    break;
            }
        }

        // 5. Map 'from' / 'to' -> 'dateFrom' / 'dateTo' or 'yearFrom' / 'yearTo'
        // Legacy 'from'/'to' usually referred to years
        if (queryParams['from']) {
            queryParams['yearFrom'] = queryParams['from'];
            delete queryParams['from'];
            hasChanges = true;
        }
        if (queryParams['to']) {
            queryParams['yearTo'] = queryParams['to'];
            delete queryParams['to'];
            hasChanges = true;
        }

        // 6. Map Facets (lists separated by ',,')
        // Legacy: doctypes=monograph,,periodical
        // New: fq=model:monograph&fq=model:periodical OR customSearch=custom-root-model:monograph,custom-root-model:periodical

        const fq: string[] = Array.isArray(queryParams['fq']) ? [...queryParams['fq']] : (queryParams['fq'] ? [queryParams['fq']] : []);
        const customSearch: string[] = queryParams['customSearch'] ? queryParams['customSearch'].split(',') : [];

        let fqChanged = false;
        let customSearchChanged = false;

        Object.keys(this.FACET_MAPPING).forEach(legacyKey => {
            if (queryParams[legacyKey]) {
                hasChanges = true;
                const newKey = this.FACET_MAPPING[legacyKey];
                const values = queryParams[legacyKey].split(',,');

                values.forEach((val: string) => {
                    if (val) {
                        // Check if this needs to go to customSearch or normal fq
                        if (legacyKey === 'doctypes') {
                            // Map to custom-root-model
                            customSearchChanged = true;
                            customSearch.push(`custom-root-model:${val}`);
                        } else {
                            fqChanged = true;
                            fq.push(`${newKey}:${val}`);
                        }
                    }
                });
                delete queryParams[legacyKey];
            }
        });

        // special handling for accessibility
        if (queryParams['accessibility']) {
            hasChanges = true;
            const val = queryParams['accessibility'];
            const values = val.split(',,');
            values.forEach((v: string) => {
                // map legacy values if needed
                if (v === 'public' || v === 'private' || v === 'accessible') {
                    // In new app, we use custom-accessibility facet
                    customSearchChanged = true;
                    // 'public' maps to 'public', 'private' usually implies 'afterLogin' or just not 'public'?
                    // Assuming direct mapping for now, or check CustomSearchService logic
                    // 'accessible' likely maps to 'available' or 'public'
                    let mappedVal = v;
                    if (v === 'accessible') mappedVal = 'public'; // fallback

                    customSearch.push(`custom-accessibility:${mappedVal}`);
                }
            });
            delete queryParams['accessibility'];
        }

        // special handling for access
        if (queryParams['access']) {
            hasChanges = true;
            const val = queryParams['access'];
            const values = val.split(',,');

            values.forEach((v: string) => {
                let mappedVal: string | null = null;
                if (v === 'open') mappedVal = 'public';
                else if (v === 'login') mappedVal = 'afterLogin';
                else if (v === 'terminal') mappedVal = 'onsite';

                if (mappedVal) {
                    customSearchChanged = true;
                    customSearch.push(`custom-accessibility:${mappedVal}`);
                }
            });

            delete queryParams['access'];
        }

        // special handling for licenses/licences
        ['licences', 'licenses'].forEach(key => {
            if (queryParams[key]) {
                hasChanges = true;
                fqChanged = true;
                const val = queryParams[key];
                const values = val.split(',,');
                const licenseFacetKey = facetKeysEnum.license; // 'licenses.facet'

                values.forEach((v: string) => {
                    if (v) {
                        fq.push(`${licenseFacetKey}:${v}`);
                    }
                });

                // Add operator param if multiple licenses or just generally to be safe/consistent with requested output
                queryParams[`${licenseFacetKey}_operator`] = 'OR';

                delete queryParams[key];
            }
        });

        if (fqChanged) {
            queryParams['fq'] = fq;
        }

        if (customSearchChanged) {
            queryParams['customSearch'] = customSearch.join(',');
        }

        if (hasChanges) {
            // Reconstruct URL with new params
            return this.router.createUrlTree([targetPath], { queryParams, queryParamsHandling: 'merge' });
        }

        return true;
    }
}

export const legacyRouteGuard: CanActivateFn = (route, state) => {
    return inject(LegacyRouteResolverService).resolve(route, state);
};
