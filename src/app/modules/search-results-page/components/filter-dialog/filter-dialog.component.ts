import {Component, computed, effect, inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatCheckbox} from '@angular/material/checkbox';
import {debounceTime, Observable, of, Subject, take} from 'rxjs';
import {map, switchMap} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';
import {SearchService} from '../../../../shared/services/search.service';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {SolrService} from '../../../../core/solr/solr.service';
import {SolrResponseParser} from '../../../../core/solr/solr-response-parser';
import {BasePaginatorComponent} from '../../../../shared/components/paginator/base-paginator.component';
import {SolrOperators, SolrSortFields} from '../../../../core/solr/solr-helpers';
import {TranslatePipe} from '@ngx-translate/core';
import {
  ToggleButtonGroupComponent,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import {PaginatorInfoComponent} from '../../../../shared/components/paginator-info/paginator-info.component';
import {QueryParamsService} from '../../../../core/services/QueryParamsManager';
import {FilterService} from '../../../../core/services/FilterUtilities';
import {InputComponent} from '../../../../shared/components/input/input.component';
import {AdvancedSearchService} from '../../../../shared/services/advanced-search.service';

@Component({
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    NgForOf,
    MatCheckbox,
    ReactiveFormsModule,
    NgIf,
    SelectedTagsComponent,
    AsyncPipe,
    PaginatorComponent,
    TranslatePipe,
    ToggleButtonGroupComponent,
    PaginatorInfoComponent,
    InputComponent,
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
    { label: SolrOperators.and, value: SolrOperators.and },
    { label: SolrOperators.or, value: SolrOperators.or }
  ];

  sortOptions = [
    { label: 'Podľa výskytu', value: SolrSortFields.count },
    { label: 'Abecedne', value: SolrSortFields.title }
  ];

  pendingSelection = signal<Set<string>>(new Set());
  pendingOperator = signal<SolrOperators>(SolrOperators.or);

  pendingFilterTags = computed(() => {
    return Array.from(this.pendingSelection()).map(value =>
      `${this.data.facetKey}:${value}`
    );
  });

  pendingOperators = computed(() => {
    const field = this.data.facetKey;
    const operator = this.pendingOperator();

    if (operator) {
      return { [field]: operator };
    }

    return {};
  });

  removePendingTag(tag: string) {
    // Extract just the value part (after the colon)
    const value = tag.split(':')[1];

    // Create a new Set without this value
    const pendingSet = new Set(this.pendingSelection());
    pendingSet.delete(value);

    // Update the pending selection
    this.pendingSelection.set(pendingSet);
  }

  clearPendingTags() {
    // Clear all pending selections
    this.pendingSelection.set(new Set());
  }

  clearPendingOperator() {
    this.pendingOperator.set(SolrOperators.or);
    this.loadFacetsWithPendingChanges();
  }

  useOrOperator = signal(false);
  sortBy = signal<SolrSortFields>(SolrSortFields.count);

  private searchTermInitialized = false;
  private dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  private route = inject(ActivatedRoute);
  public searchService = inject(SearchService);
  private solrService = inject(SolrService);
  private advancedSearchService = inject(AdvancedSearchService);

  readonly selected = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly items = signal<FacetItem[]>([]);

  allItems = signal<FacetItem[]>([]);
  searchTerm = signal('');

  override pageSize = 100;

  private searchTermSubject = new Subject<string>();

  onSearchTermChange(term: string) {
    this.searchTerm.set(term);
  }

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

    effect(() => {
      const term = this.searchTerm();

      if (!this.searchTermInitialized) {
        this.searchTermInitialized = true;
        return;
      }

      this.searchTermSubject.next(term);
    });

    this.searchTermSubject.pipe(
      debounceTime(300)
    ).subscribe((term: string) => {
      if (term.length === 0 || term.length >= 2) {
        this.page = 1;
        this.loadFacets();
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      // Initialize operator
      const operator = this.queryParamsService.getOperatorForFacet(params, this.data.facetKey);
      this.pendingOperator.set(operator);
      this.useOrOperator.set(operator !== 'AND');

      // Initialize selection
      const selectedValues = this.queryParamsService.getFiltersByFacet(params, this.data.facetKey);
      this.pendingSelection.set(new Set(selectedValues));

      // Now load facets after setting both operator and selection
      //this.loadFacetsWithPendingChanges(false);
    });

    this.loadFacets(false);

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

  close() {
    this.dialogRef.close();
  }

  override goToPage(page: number) {
    this.page = page;
    this.loadFacets(true);
  }

  loadFacetsWithPendingChanges(paginator: boolean = true) {
    this.loading.set(true);

    const page = this.page;
    const facetLimit = paginator ? this.pageSize : -1;
    const facetOffset = paginator ? (page - 1) * this.pageSize : 0;

    // Get existing operators from URL (for other facets)
    const params = this.route.snapshot.queryParams;
    const existingOperators = this.queryParamsService.getOperators(params);

    this.searchService.activeFilters$
      .pipe(
        take(1),
        switchMap(allFilters => {
          // Get all currently selected values for highlighting
          const activeSelections = new Set(
            allFilters
              .filter(f => f.startsWith(this.data.facetKey + ':'))
              .map(f => f.split(':')[1])
          );

          // Use the new method with pending selection and operator
          return this.solrService.loadFacetWithPendingChanges(
            this.searchService.searchTerm(),
            allFilters,
            this.data.facetKey,
            this.pendingSelection(),
            this.pendingOperator(),
            existingOperators,
            {
              searchTerm: this.searchTerm() || '',
              limit: facetLimit,
              offset: facetOffset,
              sortBy: this.sortBy(),
              minCount: 1,
              advancedQuery: this.advancedSearchService.getAdvancedQueryString()
            }
          ).pipe(
            map(response => ({
              response,
              selectedValues: activeSelections
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
            // When loading all items (for total count)
            this.totalCount = parsed.length;
            this.allItems.set(sortedItems);

            // Now load the paginated items
            if (this.pageSize < parsed.length) {
              this.loadFacetsWithPendingChanges(true);
            } else {
              this.items.set(sortedItems);
            }

          } else {
            // When loading paginated items
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

  loadFacets(paginator: boolean = true) {
    this.loadFacetsWithPendingChanges(paginator);
  }

  setOperator(operator: string) {
    this.pendingOperator.set(operator as SolrOperators);
    this.page = 1;

    // load facets with pending changes only if there is some selection
    if (this.pendingSelection().size > 0) {
      this.loadFacetsWithPendingChanges(false);
    }
  }

  toggle(value: string) {
    const pendingSet = new Set(this.pendingSelection());

    if (pendingSet.has(value)) {
      pendingSet.delete(value);
    } else {
      pendingSet.add(value);
    }

    this.pendingSelection.set(pendingSet);

    // if operator is AND, we need to loadFacetsWithPendingChanges with false
    if (this.pendingOperator() === 'AND') {
      this.loadFacetsWithPendingChanges(false);
    } else {
      this.loadFacetsWithPendingChanges();
    }
  }

  isSelectedFacetItem(item: FacetItem): Observable<boolean> {
    return of(this.pendingSelection().has(item.name));
  }

  setSort(sort: SolrSortFields) {
    this.sortBy.set(sort);
    this.loadFacets();
  }
}
