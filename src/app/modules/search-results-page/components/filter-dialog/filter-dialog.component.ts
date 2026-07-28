import {Component, computed, effect, Inject, inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {debounceTime, Subject, take} from 'rxjs';
import {ActivatedRoute} from '@angular/router';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {BasePaginatorComponent} from '../../../../shared/components/paginator/base-paginator.component';
import {SolrOperators, SolrSortFields} from '../../../../core/solr/solr-helpers';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {
  ToggleButtonGroupComponent,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import {PaginatorInfoComponent} from '../../../../shared/components/paginator-info/paginator-info.component';
import {QueryParamsService} from '../../../../core/services/QueryParamsManager';
import {FILTER_SERVICE, FilterService} from '../../../../shared/services/filter.service';
import {InputComponent} from '../../../../shared/components/input/input.component';
import {isFrontendFilteredFacetKey} from '../../../../shared/dialogs/advanced-search-dialog/solr-filters';
import {FormatNumberPipe} from '../../../../shared/pipes/format-number.pipe';
import {MatCheckbox} from '@angular/material/checkbox';
import {ConfigLabelPipe} from '../../../../shared/pipes/config-label.pipe';
import {NamespacedTranslatePipe} from '../../../../shared/pipes/namespaced-translate.pipe';
import {facetKeysEnum} from '../../const/facets';

@Component({
  selector: 'app-filter-dialog',
  imports: [
    FormsModule,
    NgForOf,
    ReactiveFormsModule,
    NgIf,
    SelectedTagsComponent,
    PaginatorComponent,
    TranslatePipe,
    ToggleButtonGroupComponent,
    PaginatorInfoComponent,
    InputComponent,
    FormatNumberPipe,
    MatCheckbox,
    ConfigLabelPipe,
    NamespacedTranslatePipe,
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
    { label: 'filter-dialog.sort.count', value: SolrSortFields.count },
    { label: 'filter-dialog.sort.alpha', value: SolrSortFields.title }
  ];

  isFrontendFiltered = false;

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
  private translateService = inject(TranslateService);

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
    @Inject(FILTER_SERVICE) private filterService: FilterService,
    private queryParamsService: QueryParamsService,
  ) {

    super();

    // Initialize from URL params
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      const operator = this.queryParamsService.getOperatorForFacet(params, this.data.facetKey);
      this.pendingOperator.set(operator);
      this.useOrOperator.set(operator !== SolrOperators.and);
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

        if (this.isFrontendFiltered) {
          const filtered = this.allItems().filter(item => {
            const translated = this.getItemLabel(item.name);
            return translated.toLowerCase().includes(term.toLowerCase())
          });
          this.items.set(filtered);
          // Keep the count display in sync with the frontend-filtered results.
          this.totalCount = filtered.length;
        } else {
          this.loadFacets(false);
        }
      }
    });
  }

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      // Initialize operator
      const operator = this.queryParamsService.getOperatorForFacet(params, this.data.facetKey);
      this.pendingOperator.set(operator);
      this.useOrOperator.set(operator !== SolrOperators.and);

      // Initialize selection
      const selectedValues = this.queryParamsService.getFiltersByFacet(params, this.data.facetKey);
      this.pendingSelection.set(new Set(selectedValues));

      // Now load facets after setting both operator and selection
      //this.loadFacetsWithPendingChanges(false);
    });

    this.loadFacets(false);

    this.isFrontendFiltered = isFrontendFilteredFacetKey(this.data.facetKey);

  }

  applyFilter() {
    // Convert the Set to an array
    const selectedValues = Array.from(this.pendingSelection());

    // Get the operator value
    const operator = this.pendingOperator();

    this.filterService.resetPage();

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

    // Delegate to the page's FilterService so the facet counts are scoped to the
    // current context (basic search, folder, monograph, …) instead of always the
    // global basic-search index.
    this.filterService.loadFacetPage(this.data.facetKey, {
      pendingSelection: this.pendingSelection(),
      pendingOperator: this.pendingOperator(),
      contains: this.searchTerm() || '',
      sortBy: this.sortBy(),
      limit: facetLimit,
      offset: facetOffset
    })
      .pipe(take(1))
      .subscribe({
        next: ({ items, totalCount }) => {
          if (!paginator) {
            // When loading all items (for total count)
            this.totalCount = totalCount;
            this.allItems.set(items);

            // Now load the paginated items
            if (this.pageSize < totalCount) {
              this.loadFacetsWithPendingChanges(true);
            } else {
              this.items.set(items);
            }

          } else {
            // When loading paginated items
            this.items.set(items);
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
    if (this.pendingOperator() === SolrOperators.and) {
      this.loadFacetsWithPendingChanges(false);
    } else {
      this.loadFacetsWithPendingChanges();
    }
  }


  setSort(sort: SolrSortFields) {
    this.sortBy.set(sort);

    if (this.isFrontendFiltered) {
      // For frontend filtered facets, we just sort the items
      const sortedItems = this.items().slice().sort((a, b) => {
        const translatedA = this.getItemLabel(a.name);
        const translatedB = this.getItemLabel(b.name);
        if (sort === SolrSortFields.count) {
          return b.count - a.count; // Sort by count descending
        } else if (sort === SolrSortFields.title) {
          return translatedA.localeCompare(translatedB); // Sort alphabetically
        }
        return 0;
      });
      this.items.set(sortedItems);
    } else {
      this.loadFacets();
    }
  }

  /**
   * Get display label for a facet item (used for sorting/filtering).
   * For licenses, uses config-based labels; otherwise uses i18n translation.
   */
  getItemLabel(name: string): string {
    // This is still needed for sorting and frontend filtering
    return this.translateService.instant(name);
  }

  get isLicenseFacet(): boolean {
    return this.data.facetKey === facetKeysEnum.license;
  }

  get isLanguageFacet(): boolean {
    return this.data.facetKey === facetKeysEnum.languages;
  }
}
