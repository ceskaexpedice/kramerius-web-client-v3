import { Component, signal } from '@angular/core';
import {selectFacets} from '../../../../state/search/search.selectors';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {CheckboxComponent} from '../../../../shared/components/checkbox/checkbox.component';
import {RadioButtonComponent} from '../../../../shared/components/radio-button/radio-button.component';
import {RangeSliderComponent} from '../../../../shared/components/range-slider/range-slider.component';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    CheckboxComponent,
    RadioButtonComponent,
    RangeSliderComponent,
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

  onToggleFacet(facetKey: string, value: string) {
    const facetPrefix = facetKey + ':';
    const fullValue = facetPrefix + value;

    // find all filters for this facet
    const currentFacetFilters = this.selectedFilters.filter(f => f.startsWith(facetPrefix));
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

  selectedOption = signal('option1');
}
