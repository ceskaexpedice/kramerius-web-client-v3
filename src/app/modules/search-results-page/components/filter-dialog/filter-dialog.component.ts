import {Component, effect, inject, OnInit, signal} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FacetItem} from '../../../models/facet-item';
import {FormControl, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {MatCheckbox} from '@angular/material/checkbox';
import {MatButton} from '@angular/material/button';
import {debounceTime, distinctUntilChanged, first, Observable, of} from 'rxjs';
import {switchMap} from 'rxjs/operators';
import {ActivatedRoute} from '@angular/router';
import { Store } from '@ngrx/store';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';
import {selectSearchResultsTotalCount} from '../../../../state/search/search.selectors';
import {SearchService} from '../../../../shared/services/search.service';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {SolrService} from '../../../../core/solr/solr.service';
import {SolrResponseParser} from '../../../../core/solr/solr-response-parser';
import {BasePaginatorComponent} from '../../../../shared/components/paginator/base-paginator.component';

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

  totalCount$: Observable<number>;
  useOrOperator = signal(true);

  private dialogRef = inject(MatDialogRef<FilterDialogComponent>);
  private store = inject(Store);
  private route = inject(ActivatedRoute);
  public searchService = inject(SearchService);
  private solrService = inject(SolrService);

  readonly searchControl = new FormControl('');
  readonly selected = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly items = signal<FacetItem[]>([]);

  constructor() {

    super();

    this.totalCount$ = this.store.select(selectSearchResultsTotalCount);

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

  setOperator(operator: 'OR' | 'AND') {
    this.useOrOperator.set(operator === 'OR');
    this.updateUrl();
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

    this.solrService
      .loadFacet( '*:*', [], this.data.facetKey, this.searchControl.value || '', true, facetLimit, facetOffset)
      .pipe(first())
      .subscribe({
        next: v => {
          // if without paginator, set only totalCount from response
          const parsed = SolrResponseParser.parseFacet(v.facet_counts.facet_fields?.[this.data.facetKey] || []);

          if (!paginator) {
            this.totalCount = parsed.length;
          } else {
            this.items.set(parsed);
          }

          this.loading.set(false);
        }
      })
  }

  isSelectedFacetItem(item: FacetItem): Observable<boolean> {
    return this.searchService.isSelectedFacetItem(`${this.data.facetKey}:${item.name}`);
  }
}
