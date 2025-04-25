import {Component, effect, inject, OnInit, signal, computed} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {debounceTime, distinctUntilChanged, Observable, of, take} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import {Store} from '@ngrx/store';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';
import {SearchService} from '../../../../shared/services/search.service';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {SolrService} from '../../../../core/solr/solr.service';
import {SolrResponseParser} from '../../../../core/solr/solr-response-parser';
import {BasePaginatorComponent} from '../../../../shared/components/paginator/base-paginator.component';
import {SolrSortFields} from '../../../../core/solr/solr-helpers';
import {TranslatePipe} from '@ngx-translate/core';
import {
  ToggleButtonGroupComponent
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import {PaginatorInfoComponent} from '../../../../shared/components/paginator-info/paginator-info.component';

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
    PaginatorComponent,
    TranslatePipe,
    ToggleButtonGroupComponent,
    PaginatorInfoComponent,
  ],
  standalone: true,
  templateUrl: './filter-dialog.component.html',
  styleUrl: './filter-dialog.component.scss'
})
export class FilterDialogComponent extends BasePaginatorComponent implements OnInit {
  public data = inject(MAT_DIALOG_DATA) as {
    facetKey: string;
    facetLabel: string;
    items: FacetItem[];
  };

  operatorOptions = [
    { label: 'Všetky', value: 'AND' },
    { label: 'Niektoré', value: 'OR' }
  ];

  sortOptions = [
    { label: 'Podľa výskytu', value: SolrSortFields.count },
    { label: 'Abecedne', value: SolrSortFields.title }
  ];

  // Track pending changes (items to add/remove)
  pendingSelection = signal<Set<string>>(new Set());
  pendingOperator = signal<'AND' | 'OR'>('OR'); // Default to OR

// Track if there are any pending changes
  hasPendingChanges = computed(() => {
    // Check if operator changed
    const currentOperator = this.useOrOperator() ? 'OR' : 'AND';
    const operatorChanged = this.pendingOperator() !== currentOperator;

    // Check if selection changed
    return operatorChanged || this.pendingSelection().size > 0;
  });

  useOrOperator = signal(false);
  sortBy = signal<SolrSortFields>(SolrSortFields.count);

  private dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  public searchService = inject(SearchService);
  private solrService = inject(SolrService);

  readonly searchControl = new FormControl('');
  readonly selected = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly items = signal<FacetItem[]>([]);

  allItems = signal<FacetItem[]>([]);

  constructor() {

    super();

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const operatorParam = params[`${this.data.facetKey}_operator`];
      this.useOrOperator.set(operatorParam !== 'AND');
    });


    this.loadFacets(false);

    effect(() => {
      const sub = this.searchControl.valueChanges
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          switchMap(term => {

            // TODO: Implement search logic

            if (term && term.length > 0 && term.length < 2) {
              return of(null);
            }

            this.loadFacets(true);

            return of(null);
          })
        )
        .subscribe();

      return () => sub.unsubscribe();
    });
  }

  ngOnInit() {
    this.loadFacets();

    // Initialize from current URL params
    const params = this.route.snapshot.queryParams;
    const operatorParam = params[`${this.data.facetKey}_operator`];

    // Set initial operator state
    // If operatorParam is 'AND', set pendingOperator to 'AND', otherwise default to 'OR'
    this.pendingOperator.set(operatorParam === 'AND' ? 'AND' : 'OR');

    // Initialize pending selection from current state
    this.getSelectedValues().pipe(take(1)).subscribe(values => {
      this.pendingSelection.set(new Set(values));
    });
  }


  setOperator(operator: string) {
    this.pendingOperator.set(operator as 'AND' | 'OR');
  }


  applyFilter() {
    // Convert the Set to an array
    const selectedValues = Array.from(this.pendingSelection());

    // Get the operator value - note the values are now reversed from your original code
    const useAndOperator = this.pendingOperator() !== 'OR'; // true if 'OR', false if 'AND'

    // Apply all changes at once
    this.searchService.updateFilters(
      this.route,
      this.data.facetKey,
      selectedValues,
      useAndOperator
    );

    // Close the dialog
    this.close();
  }

  toggle(value: string) {
    const pendingSet = new Set(this.pendingSelection());

    if (pendingSet.has(value)) {
      pendingSet.delete(value);
    } else {
      pendingSet.add(value);
    }

    this.pendingSelection.set(pendingSet);
  }

  updateFilters(values: string[], useOrOperator: boolean) {
    this.searchService.updateFilters(
      this.route,
      this.data.facetKey,
      values,
      useOrOperator
    );
  }

  // Helper method to extract selected values for this facet
  private getSelectedValues(): Observable<string[]> {
    return this.searchService.activeFilters$.pipe(
      map(filters => filters
        .filter(f => f.startsWith(this.data.facetKey + ':'))
        .map(f => f.split(':')[1])
      )
    );
  }


  updateUrl() {
    this.searchService.updateFilters(
      this.route,
      this.data.facetKey,
      Array.from(this.selected()),
      this.useOrOperator()
    );
  }

  close() {
    this.dialogRef.close();
  }

  override goToPage(page: number) {
    this.page = page;
    this.loadFacets(true);
  }

  loadFacets(paginator: boolean = true) {
    this.loading.set(true);

    let page = this.page;
    let facetLimit = this.pageSize || -1;
    let facetOffset = (page - 1) * facetLimit;

    if (!paginator) {
      facetLimit = -1;
      facetOffset = 0;
    }

    // Extract existing operators from URL
    const existingOperators: Record<string, string> = {};
    const params = this.route.snapshot.queryParams;

    Object.keys(params).forEach(key => {
      if (key.endsWith('_operator')) {
        const field = key.replace('_operator', '');
        existingOperators[field] = params[key];
      }
    });

    this.searchService.activeFilters$
      .pipe(
        take(1),
        switchMap(allFilters => {
          // Extract selected values for this facet
          const selectedValues = new Set(
            allFilters
              .filter(f => f.startsWith(this.data.facetKey + ':'))
              .map(f => f.split(':')[1])
          );

          // Filters excluding the current facet
          const filteredFilters = allFilters.filter(f => !f.startsWith(this.data.facetKey + ':'));

          return this.solrService.loadFacet(
            '*:*',
            filteredFilters,
            this.data.facetKey,
            this.searchControl.value || '',
            true,
            facetLimit,
            facetOffset,
            this.sortBy(),
            1,
            existingOperators
          ).pipe(
            map(response => ({
              response,
              selectedValues
            }))
          );
        })
      )
      .subscribe({
        next: ({ response, selectedValues }) => {
          const parsed = SolrResponseParser.parseFacet(
            response.facet_counts.facet_fields?.[this.data.facetKey] || []
          );

          // Move selected items to the top, maintaining API sort within each group
          const sortedItems = [...parsed].sort((a, b) => {
            const aSelected = selectedValues.has(a.name);
            const bSelected = selectedValues.has(b.name);

            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return 0;
          });

          if (!paginator) {
            this.totalCount = parsed.length;
            this.allItems.set(sortedItems);
          } else {
            this.items.set(sortedItems);
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading facets:', err);
          this.loading.set(false);
        }
      });
  }

  isSelectedFacetItem(item: FacetItem): Observable<boolean> {
    return this.searchService.isSelectedFacetItem(`${this.data.facetKey}:${item.name}`)
      .pipe(
        map(isCurrentlySelected => {
          // Check if this item has a pending change
          const isPendingSelected = this.pendingSelection().has(item.name);

          // Return the pending state
          return isPendingSelected;
        })
      );
  }

  setSort(sort: SolrSortFields) {
    this.sortBy.set(sort);
    this.loadFacets();
  }
}
