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
import {QueryParamsService} from '../../../../core/services/QueryParamsManager';
import {FilterService} from '../../../../core/services/FilterUtilities';

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

  constructor(
    private filterService: FilterService,
    private queryParamsService: QueryParamsService,
  ) {

    super();

    // Initialize from URL params
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const operator = this.queryParamsService.getOperatorForFacet(params, this.data.facetKey);
      this.pendingOperator.set(operator);
      this.useOrOperator.set(operator !== 'AND');
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

    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const selectedValues = this.queryParamsService.getFiltersByFacet(params, this.data.facetKey);
      this.pendingSelection.set(new Set(selectedValues));
    });

  }


  setOperator(operator: string) {
    this.pendingOperator.set(operator as 'AND' | 'OR');
  }


  applyFilter() {
    // Convert the Set to an array
    const selectedValues = Array.from(this.pendingSelection());

    // Get the operator value
    const operator = this.pendingOperator();

    // Update filters with the chosen operator
    this.queryParamsService.updateFilters(
      this.route,
      this.data.facetKey,
      selectedValues,
      operator
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

    const page = this.page;
    const facetLimit = paginator ? (this.pageSize || -1) : -1;
    const facetOffset = paginator ? (page - 1) * facetLimit : 0;

    // Extract existing operators from URL
    const params = this.route.snapshot.queryParams;
    const existingOperators = this.queryParamsService.getOperators(params);

    this.searchService.activeFilters$
      .pipe(
        take(1),
        switchMap(allFilters => {
          // Extract selected values
          const selectedValues = new Set(
            allFilters
              .filter(f => f.startsWith(this.data.facetKey + ':'))
              .map(f => f.split(':')[1])
          );

          // Filters excluding the current facet
          const filteredFilters = allFilters.filter(
            f => !f.startsWith(this.data.facetKey + ':')
          );

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

          // Sort with selected items at the top
          const sortedItems = this.filterService.sortWithSelectedOnTop(parsed, selectedValues);

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
