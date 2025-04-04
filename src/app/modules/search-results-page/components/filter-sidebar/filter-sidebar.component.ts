import { Component } from '@angular/core';
import {selectFacets} from '../../../../state/search/search.selectors';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import * as SearchActions from '../../../../state/search/search.actions';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
  ],
  templateUrl: './filter-sidebar.component.html',
  styleUrl: './filter-sidebar.component.scss'
})
export class FilterSidebarComponent {
  facetKeys: string[] = [
    'authors.facet',
    'languages.facet',
    'genres.facet',
    'keywords.facet',
    'geographic_names.facet',
    'publishers.facet',
    'publication_places.facet'
  ];

  facetLabels: { [key: string]: string } = {
    'authors.facet': 'Autori',
    'languages.facet': 'Jazyk',
    'genres.facet': 'Žáner',
    'keywords.facet': 'Kľúčové slovo',
    'geographic_names.facet': 'Geografický názov',
    'publishers.facet': 'Nakladateľ',
    'publication_places.facet': 'Miesto vydania'
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

  onToggleFacet(value: string) {
    const newFilters = this.selectedFilters.includes(value)
      ? this.selectedFilters.filter(f => f !== value)
      : [...this.selectedFilters, value];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fq: newFilters },
      queryParamsHandling: 'merge'
    });
  }
}
