import { Component, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {map, Observable} from 'rxjs';
import { FilterService } from '../../services/filter.service';
import {ONLINE_LICENSES} from '../../../core/solr/solr-misc';
import {SearchService} from '../../services/search.service';
import {facetKeysEnum} from '../../../modules/search-results-page/const/facets';
import {FacetItem} from '../../../modules/models/facet-item';

@Component({ template: '' })
export abstract class BaseFiltersComponent {
  abstract facetKeys: string[];
  selectedFilters: string[] = [];
  facets$: Observable<any> = new Observable<any>();

  constructor(
    @Inject('FilterService') protected filterService: FilterService,
    protected route: ActivatedRoute,
    protected searchService: SearchService
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
            available: this.searchService.licenses.includes(item.name),
            icon: this.searchService.licenses.includes(item.name)
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

  protected initializeFilters(): void {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      this.selectedFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    });
  }

  onToggleFacet(fullValue: string): void {
    console.log(fullValue);
    this.filterService.toggleFilter(this.route, fullValue);
  }
}
