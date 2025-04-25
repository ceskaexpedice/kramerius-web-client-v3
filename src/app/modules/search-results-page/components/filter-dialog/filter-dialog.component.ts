import {Component, effect, inject, OnInit, signal} from '@angular/core';
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
    { label: 'Všetky', value: 'OR' },
    { label: 'Niektoré', value: 'AND' }
  ];

  sortOptions = [
    { label: 'Podľa výskytu', value: SolrSortFields.count },
    { label: 'Abecedne', value: SolrSortFields.title }
  ];

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
    this.loadFacets()
  }

  setOperator(operator: any) {
    const op = operator as 'OR' | 'AND';
    this.useOrOperator.set(op === 'OR');

    // Get current selected values and update with new operator
    this.getSelectedValues().pipe(take(1)).subscribe(values => {
      this.updateFilters(values, op === 'OR');
    });
  }


  toggle(value: string) {
    // Get current selected values from activeFilters$
    this.getSelectedValues().pipe(take(1)).subscribe(currentValues => {
      let newValues: string[];

      if (currentValues.includes(value)) {
        // Remove the value if it's already selected
        newValues = currentValues.filter(v => v !== value);
      } else {
        // Add the value if it's not selected
        newValues = [...currentValues, value];
      }

      // Update filters with the new values
      this.updateFilters(newValues, this.useOrOperator());
    });
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

    // First, get the selected values
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

          // If we're using alphabetical sorting, we need to ensure selected items are included
          // So we'll make a request with no limit to get all items when using alphabetical sort
          const needsAllItems = this.sortBy() === SolrSortFields.title && selectedValues.size > 0;

          return this.solrService.loadFacet(
            '*:*',
            filteredFilters,
            this.data.facetKey,
            this.searchControl.value || '',
            true,
            needsAllItems ? -1 : facetLimit,  // Get all items if needed
            needsAllItems ? 0 : facetOffset,  // No offset if getting all items
            this.sortBy()
          ).pipe(
            map(response => ({
              response,
              selectedValues,
              needsAllItems
            }))
          );
        })
      )
      .subscribe({
        next: ({ response, selectedValues, needsAllItems }) => {
          // Parse the facet results
          const parsed = SolrResponseParser.parseFacet(
            response.facet_counts.facet_fields?.[this.data.facetKey] || []
          );

          if (needsAllItems) {
            // If we got all items (for alphabetical sorting), we need to:
            // 1. Split selected and non-selected items
            const selectedItems = parsed.filter(item => selectedValues.has(item.name));
            const nonSelectedItems = parsed.filter(item => !selectedValues.has(item.name));

            // 2. Maintain API sort order within each group
            const allSorted = [...selectedItems, ...nonSelectedItems];

            // 3. Apply pagination manually
            if (paginator) {
              const start = (page - 1) * this.pageSize;
              const end = start + this.pageSize;
              this.items.set(allSorted.slice(start, end));
              this.totalCount = allSorted.length;
            } else {
              this.items.set(allSorted);
              this.allItems.set(allSorted);
              this.totalCount = allSorted.length;
            }
          } else {
            // For count-based sorting or when there are no selected items,
            // the API will return items in the correct order already
            // We just need to sort to move selected items to the top
            const sortedItems = [...parsed].sort((a, b) => {
              const aSelected = selectedValues.has(a.name);
              const bSelected = selectedValues.has(b.name);

              if (aSelected && !bSelected) return -1;
              if (!aSelected && bSelected) return 1;

              // If both have the same selection status, maintain API sort order
              return 0;
            });

            if (!paginator) {
              this.totalCount = parsed.length;
              this.allItems.set(sortedItems);
            } else {
              this.items.set(sortedItems);
            }
          }

          this.loading.set(false);
        },
        error: (err) => {
          console.error('Error loading facets:', err);
          this.loading.set(false);
        }
      });
  }

  // loadFacets(paginator: boolean = true) {
  //   this.loading.set(true);
  //
  //   let page = this.page;
  //   let facetLimit = this.pageSize || -1;
  //   let facetOffset = (page - 1) * facetLimit;
  //
  //   if (!paginator) {
  //     facetLimit = -1;
  //     facetOffset = 0;
  //   }
  //
  //   this.searchService.activeFilters$
  //     .pipe(
  //       take(1),
  //       // Get all filters and extract selected values for this facet
  //       switchMap(allFilters => {
  //         const selectedValues = new Set(
  //           allFilters
  //             .filter(f => f.startsWith(this.data.facetKey + ':'))
  //             .map(f => f.split(':')[1])
  //         );
  //
  //         const filteredFilters = allFilters.filter(f => !f.startsWith(this.data.facetKey + ':'));
  //
  //         return this.solrService.loadFacet(
  //           '*:*',
  //           filteredFilters,
  //           this.data.facetKey,
  //           this.searchControl.value || '',
  //           true,
  //           facetLimit,
  //           facetOffset,
  //           this.sortBy()
  //         ).pipe(
  //           map(response => ({
  //             response,
  //             selectedValues
  //           }))
  //         );
  //       })
  //     )
  //     .subscribe({
  //       next: ({ response, selectedValues }) => {
  //         const parsed = SolrResponseParser.parseFacet(
  //           response.facet_counts.facet_fields?.[this.data.facetKey] || []
  //         );
  //
  //         // Sort the items so that selected items come first
  //         const sortedItems = [...parsed].sort((a, b) => {
  //           const aSelected = selectedValues.has(a.name);
  //           const bSelected = selectedValues.has(b.name);
  //
  //           if (aSelected && !bSelected) return -1;
  //           if (!aSelected && bSelected) return 1;
  //
  //           // If both are selected or both are not selected, maintain the original order
  //           return 0;
  //         });
  //
  //         if (!paginator) {
  //           this.totalCount = parsed.length;
  //           this.allItems.set(sortedItems);
  //         } else {
  //           this.items.set(sortedItems);
  //         }
  //
  //         this.loading.set(false);
  //       }
  //     });
  // }

  isSelectedFacetItem(item: FacetItem): Observable<boolean> {
    return this.searchService.isSelectedFacetItem(`${this.data.facetKey}:${item.name}`);
  }

  setSort(sort: SolrSortFields) {
    this.sortBy.set(sort);
    this.loadFacets();
  }
}
