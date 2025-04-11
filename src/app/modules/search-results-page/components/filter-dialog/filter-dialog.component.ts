import {Component, computed, effect, inject, Inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {debounceTime, distinctUntilChanged, Observable, of} from 'rxjs';
import {switchMap, map} from 'rxjs/operators';
import {ActivatedRoute, Router} from '@angular/router';
import { Store } from '@ngrx/store';
import * as SearchSelectors from '../../../../state/search/search.selectors';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';
import {selectSearchResultsTotalCount} from '../../../../state/search/search.selectors';

@Component({
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    NgForOf,
    MatCheckbox,
    MatButton,
    ReactiveFormsModule,
    NgIf,
    SelectedTagsComponent,
    AsyncPipe,
  ],
  standalone: true,
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.scss'
})
export class FilterDialogComponent implements OnInit {
  public data = inject(MAT_DIALOG_DATA) as {
    facetKey: string;
    facetLabel: string;
    items: FacetItem[];
  };

  totalCount$: Observable<number>;

  private dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  private store = inject(Store);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  readonly searchControl = new FormControl('');
  readonly selected = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly items = signal<FacetItem[]>([]);
  readonly allItems = signal<FacetItem[]>([]);

  constructor() {
    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);

    // Sledujeme zmeny v store a aktualizujeme items
    effect(() => {
      const sub = this.store.select(SearchSelectors.selectFacetItems(this.data.facetKey))
        .subscribe(facets => {
          if (facets) {
            this.allItems.set(facets);
            this.items.set(facets);
            this.loading.set(false);
          }
        });

      return () => sub.unsubscribe();
    });

    effect(() => {
      const sub = this.searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(term => {
            if (!term || term.length < 2) {
              this.items.set(this.allItems());
              return of(null);
            }

            this.loading.set(true);
            // Filtrujeme lokálne
            const filteredItems = this.allItems().filter(item =>
              this.normalizeString(item.name).includes(this.normalizeString(term))
            );
            this.items.set(filteredItems);
            this.loading.set(false);
            return of(null);
          })
        )
        .subscribe();

      return () => sub.unsubscribe();
    });
  }

  ngOnInit() {
    this.initSelectedFromUrl();
    this.loadInitialFacets();
  }

  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Odstráni diakritiku
      .replace(/[^a-z0-9]/g, ''); // Ponechá len písmená a čísla
  }

  private loadInitialFacets() {
    this.loading.set(true);
    // this.store.dispatch(SearchActions.loadFacet({
    //   query: this.route.snapshot.queryParams['q'] || '*:*',
    //   filters: this.getCurrentFilters(),
    //   facet: this.data.facetKey
    // }));
    this.items.set(this.data.items);
  }

  private initSelectedFromUrl() {
    const fq = this.route.snapshot.queryParams['fq'];
    const active = Array.isArray(fq) ? fq : fq ? [fq] : [];

    const selected = new Set<string>();

    active.forEach(filter => {
      if (filter.startsWith(this.data.facetKey + ':')) {
        // Odstránime facetKey a zátvorky
        const value = filter.substring(this.data.facetKey.length + 1);
        if (value.startsWith('(') && value.endsWith(')')) {
          // Máme OR operátor v zátvorkách
          const values = value
            .slice(1, -1) // Odstránime vonkajšie zátvorky
            .split(' OR ')
            .map((v: string) => v.trim().replace(/^"(.*)"$/, '$1')); // Odstránime úvodzovky
          values.forEach((v: string) => selected.add(v));
        } else {
          // Jednoduchá hodnota
          selected.add(value.replace(/^"(.*)"$/, '$1'));
        }
      }
    });

    this.selected.set(selected);
  }

  isSelected(value: string): boolean {
    return this.selected().has(value);
  }

  toggle(value: string) {
    const next = new Set(this.selected());
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    this.selected.set(next);
    this.updateUrl();
  }

  updateUrl() {
    const fq = this.route.snapshot.queryParams['fq'];
    const otherFilters = (Array.isArray(fq) ? fq : fq ? [fq] : []).filter(
      f => !f.startsWith(this.data.facetKey + ':')
    );

    // Pridáme každú hodnotu ako samostatný fq parameter bez úvodzoviek
    const selectedValues = Array.from(this.selected());
    const facetFilters = selectedValues.map(value => `${this.data.facetKey}:${value}`);

    const updated = [
      ...otherFilters,
      ...facetFilters
    ];

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { fq: updated },
      queryParamsHandling: 'merge'
    });
  }

  close() {
    this.dialogRef.close();
  }

  get selectedArray(): string[] {
    return Array.from(this.selected());
  }

  unselectFilter(filter: string) {
    const next = new Set(this.selected());
    next.delete(filter);
    this.selected.set(next);
    this.updateUrl();
  }

  unselectAllFilters() {
    this.selected.set(new Set());
    this.updateUrl();
  }
}
