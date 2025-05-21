import {Component, inject, OnInit} from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';
import {NgForOf, NgIf} from '@angular/common';
import {SelectedTagsComponent} from '../../components/selected-tags/selected-tags.component';
import {SearchService} from '../../services/search.service';
import {AdvancedSearchService} from '../../services/advanced-search.service';
import {take} from 'rxjs';
import {QueryParamsService} from '../../../core/services/QueryParamsManager';
import {ActivatedRoute} from '@angular/router';
import {
  AdvancedSearchFilterGroupComponent,
} from './components/advanced-search-filter-group/advanced-search-filter-group.component';
import {SolrOperators} from '../../../core/solr/solr-helpers';

@Component({
  selector: 'app-advanced-search-dialog',
  imports: [
    TranslatePipe,
    SelectedTagsComponent,
    NgIf,
    AdvancedSearchFilterGroupComponent,
    NgForOf,
  ],
  templateUrl: './advanced-search-dialog.component.html',
  styleUrl: './advanced-search-dialog.component.scss'
})
export class AdvancedSearchDialogComponent implements OnInit {

  private dialogRef = inject(MatDialogRef<AdvancedSearchDialogComponent>);
  public searchService = inject(SearchService);
  public advancedSearchService = inject(AdvancedSearchService);
  private route = inject(ActivatedRoute);
  private queryParamsService = inject(QueryParamsService);

  ngOnInit(): void {
    this.searchService.activeFilters$.pipe(take(1)).subscribe(filters => {
      this.advancedSearchService.setPendingFilters(filters);

      this.searchService.getFiltersWithOperators().pipe(take(1)).subscribe(operators => {
        this.advancedSearchService.setPendingOperators(operators);
      });
    });

    if (this.advancedSearchService.pendingGroups().length === 0) {
      this.advancedSearchService.addGroup();
    }

  }

  removePendingTag(tag: string) {
    const filters = this.advancedSearchService.getFilters().filter(f => f !== tag);
    this.advancedSearchService.setPendingFilters(filters);
  }

  clearPendingOperator(facet: string) {
    const ops = { ...this.advancedSearchService.getOperators() };
    delete ops[facet];
    this.advancedSearchService.setPendingOperators(ops);
  }

  clearAllPending() {
    this.advancedSearchService.clear();
  }

  submit() {
    const groups = this.advancedSearchService.pendingGroups();

    const filtersByFacet: Record<string, string[]> = {};
    const operators: Record<string, SolrOperators> = {};

    for (const group of groups) {
      for (const filter of group.filters) {
        if (!filter.value?.trim()) continue;

        const field = filter.solrField;
        if (!field) continue;

        if (!filtersByFacet[field]) {
          filtersByFacet[field] = [];
        }

        filtersByFacet[field].push(filter.value);

        operators[field] = group.operator;
      }
    }

    this.queryParamsService.updateMultipleFilters(
      this.route,
      filtersByFacet,
      operators
    );

    this.close();
  }

  close() {
    this.dialogRef.close();
  }

}
