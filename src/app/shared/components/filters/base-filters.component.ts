import { Component, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {map, Observable} from 'rxjs';
import { FilterService } from '../../services/filter.service';
import {ONLINE_LICENSES} from '../../../core/solr/solr-misc';
import {SearchService} from '../../services/search.service';
import {customDefinedFacets, facetKeysEnum} from '../../../modules/search-results-page/const/facets';
import {FacetItem} from '../../../modules/models/facet-item';
import {CustomSearchService} from '../../services/custom-search.service';
import {UserService} from '../../services/user.service';

@Component({ template: '' })
export abstract class BaseFiltersComponent {
  abstract facetKeys: string[];
  selectedFilters: string[] = [];
  facets$: Observable<any> = new Observable<any>();

  constructor(
    @Inject('FilterService') protected filterService: FilterService,
    protected route: ActivatedRoute,
    protected searchService: SearchService,
    protected customSearchService: CustomSearchService,
    protected userService: UserService
  ) {
    this.initializeFilters();

    this.getFacets();

    this.sortFacets();
  }

  getFacets() {
    this.facets$ = this.filterService.getFacets().pipe(
      map(facets => {
        const updated = { ...facets };

        if (updated[facetKeysEnum.license]) {
          updated[facetKeysEnum.license] = updated[facetKeysEnum.license].map((item: FacetItem) => ({
            ...item,
            available: this.userService.licenses.includes(item.name),
            icon: this.userService.licenses.includes(item.name)
              ? 'icon-eye'
              : ONLINE_LICENSES.includes(item.name)
                ? 'icon-lock'
                : 'icon-home'
          }));
        }

        return updated;
      })
    );
  }

  sortFacets() {
    // if facetKey is license, sort by available first, then ONLINE_LICENSES, then alphabetically
    this.facets$ = this.facets$.pipe(
      map(facets => {
        if (facets[facetKeysEnum.license]) {
          facets[facetKeysEnum.license].sort((a: FacetItem, b: FacetItem) => {
            if (a.available && !b.available) return -1;
            if (!a.available && b.available) return 1;
            if (ONLINE_LICENSES.includes(a.name) && !ONLINE_LICENSES.includes(b.name)) return -1;
            if (!ONLINE_LICENSES.includes(a.name) && ONLINE_LICENSES.includes(b.name)) return 1;
            return a.name.localeCompare(b.name);
          });
        }
        return facets;
      })
    );
  }

  // protected initializeFilters(): void {
  //   this.route.queryParams.subscribe(params => {
  //     const fq = params['fq'];
  //     this.selectedFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
  //   });
  // }

  protected initializeFilters(): void {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      const fqFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];

      const customRaw = params['customSearch'];
      const customFilters = Array.isArray(customRaw)
        ? customRaw
        : customRaw
          ? customRaw.split(',')
          : [];

      this.selectedFilters = [...fqFilters, ...customFilters];
    });
  }

  onToggleFacet(fullValue: string): void {
    console.log(fullValue);
    // fullValue is expected to be in the format 'facetKey:facetValue'
    // we need to check if facetKey is in customDefinedFacets, if so, we need to toggle the filter using the customSearchService
    const [facetKey, facetValue] = fullValue.split(':');
    const isCustom = customDefinedFacets.find(c => c.facetKey === facetKey);
    if (isCustom) {
      this.customSearchService.toggleFilter(fullValue);
      return;
    }
    this.filterService.toggleFilter(this.route, fullValue);
  }
}
