import { Component } from '@angular/core';
import {selectFacets} from '../../../../state/search/search.selectors';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatDialog} from '@angular/material/dialog';
import {FilterCategoryComponent} from '../../../../shared/components/filter-category/filter-category.component';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    FilterCategoryComponent,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent {
  facetKeys: string[] = [
    'model',
    'authors.facet',
    'languages.facet',
    'genres.facet',
    'keywords.facet',
    'geographic_names.facet',
    'publishers.facet',
    'publication_places.facet',
    'physical_locations.facet',
  ];

  facetLabels: { [key: string]: string } = {
    'model': 'Typ',
    'authors.facet': 'Autori',
    'languages.facet': 'Jazyk',
    'genres.facet': 'Žáner',
    'keywords.facet': 'Kľúčové slovo',
    'geographic_names.facet': 'Geografický názov',
    'publishers.facet': 'Nakladateľ',
    'publication_places.facet': 'Miesto vydania',
    'physical_locations.facet': 'Fyzická lokalita',
  };

  facets$ = this.store.select(selectFacets);
  selectedFilters: string[] = [];

  constructor(
    private store: Store,
    private route: ActivatedRoute,
    private router: Router
  ) {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      this.selectedFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];
    });
  }

  onToggleFacet(fullValue: string) {
    // find all filters for this facet
    const facetKey = fullValue.split(':')[0];
    const currentFacetFilters = this.selectedFilters.filter(f => f.startsWith(facetKey + ':'));
    let newFilters: string[];

    if (currentFacetFilters.includes(fullValue)) {
      // Delete this facet
      newFilters = this.selectedFilters.filter(f => f !== fullValue);
    } else {
      // add new filter (or operator in same facet)
      newFilters = [...this.selectedFilters, fullValue];
    }

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fq: newFilters },
      queryParamsHandling: 'merge'
    });
  }

}
