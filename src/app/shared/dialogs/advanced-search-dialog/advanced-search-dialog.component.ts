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

  ngOnInit(): void {
    this.advancedSearchService.initializeFromRoute();
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
    this.advancedSearchService.onSubmitAdvancedSearch();

    this.close();
  }

  close() {
    this.dialogRef.close();
  }

}
