import { Component, signal } from '@angular/core';
import {selectFacets} from '../../../../state/search/search.selectors';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {AsyncPipe, NgForOf, NgIf, SlicePipe} from '@angular/common';
import {CheckboxComponent} from '../../../../shared/components/checkbox/checkbox.component';
import {RadioButtonComponent} from '../../../../shared/components/radio-button/radio-button.component';
import {RangeSliderComponent} from '../../../../shared/components/range-slider/range-slider.component';
import {FacetItem} from '../../../models/facet-item';
import {MatDialog} from '@angular/material/dialog';
import {FilterDialogComponent} from '../filter-dialog/filter-dialog.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-filter-sidebar',
  imports: [
    AsyncPipe,
    NgIf,
    NgForOf,
    CheckboxComponent,
    RadioButtonComponent,
    RangeSliderComponent,
    SlicePipe,
    TranslatePipe,
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
    private router: Router,
    private dialog: MatDialog
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

  openFilterDialog(facetKey: string, facetLabel: string, items: FacetItem[]) {
    const selected = this.selectedFilters
      .filter(f => f.startsWith(facetKey + ':'))
      .map(f => f.split(':')[1]);

    const dialogRef = this.dialog.open(FilterDialogComponent, {
      width: '600px',
      data: { facetKey, facetLabel, items, selected }
    });

    dialogRef.afterClosed().subscribe((selectedValues: string[]) => {
      if (selectedValues) {
        const newFilters = [
          ...this.selectedFilters.filter(f => !f.startsWith(facetKey + ':')),
          ...selectedValues.map(v => `${facetKey}:${v}`)
        ];
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { fq: newFilters },
          queryParamsHandling: 'merge'
        });
      }
    });
  }

  selectedOption = signal('option1');
}
