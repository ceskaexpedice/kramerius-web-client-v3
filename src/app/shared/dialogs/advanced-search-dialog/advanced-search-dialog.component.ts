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
  AdvancedSearchFilterGroupComponent
} from './components/advanced-search-filter-group/advanced-search-filter-group.component';

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
    const filters = this.advancedSearchService.getFilters();
    const operators = this.advancedSearchService.getOperators();

    const filtersByFacet: Record<string, string[]> = {};

    filters.forEach(f => {
      const [facet, value] = f.split(':');
      if (!filtersByFacet[facet]) {
        filtersByFacet[facet] = [];
      }
      filtersByFacet[facet].push(value);
    });

    this.queryParamsService.updateMultipleFilters(
      this.route,
      filtersByFacet,
      operators
    );

    this.dialogRef.close();
  }

  // applyFilter() {
  //   // Convert the Set to an array
  //   const selectedValues = Array.from(this.advancedSearchService.filters());
  //
  //   // Get the operator value
  //   const operator = this.pendingOperator();
  //
  //   // Update filters with the chosen operator
  //   this.queryParamsService.updateFilters(
  //     this.route,
  //     this.data.facetKey,
  //     selectedValues,
  //     operator
  //   );
  //
  //   // Close the dialog
  //   this.close();
  // }

  close() {
    this.dialogRef.close();
  }

}
