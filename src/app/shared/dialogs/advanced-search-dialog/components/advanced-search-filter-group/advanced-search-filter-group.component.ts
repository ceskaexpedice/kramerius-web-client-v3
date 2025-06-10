import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {AdvancedSearchFilterRow} from '../advanced-search-filter-row/advanced-search-filter-row';
import {NgForOf, NgIf} from '@angular/common';
import {SolrOperators} from '../../../../../core/solr/solr-helpers';
import {AdvancedFilterDefinition, DEFAULT_ADVANCED_FILTER} from '../../solr-filters';
import {TranslatePipe} from '@ngx-translate/core';
import {AdvancedSearchService} from '../../../../services/advanced-search.service';

@Component({
  selector: 'advanced-search-filter-group',
  imports: [
    AdvancedSearchFilterRow,
    NgForOf,
    TranslatePipe,
    NgIf,
  ],
  templateUrl: './advanced-search-filter-group.component.html',
  styleUrl: './advanced-search-filter-group.component.scss'
})
export class AdvancedSearchFilterGroupComponent implements OnInit {
  @Input() filters: AdvancedFilterDefinition[] = [];
  @Input() operator: SolrOperators = SolrOperators.and;

  @Output() filtersChange = new EventEmitter<AdvancedFilterDefinition[]>();
  @Output() operatorChange = new EventEmitter<SolrOperators>();
  @Output() removeGroup = new EventEmitter<void>();

  public advancedSearchService = inject(AdvancedSearchService);

  ngOnInit() {
    if (this.filters.length === 0) {
      this.addFilter();
    }
  }

  addFilter() {
    const defaultFilter = { ...DEFAULT_ADVANCED_FILTER, value: '' };
    this.filters = [...this.filters, defaultFilter];
    this.filtersChange.emit(this.filters);
  }

  updateFilter(index: number, updated: AdvancedFilterDefinition) {
    this.filters = [...this.filters.slice(0, index), updated, ...this.filters.slice(index + 1)];
    this.filtersChange.emit(this.filters);
  }

  removeFilter(index: number) {
    this.filters = this.filters.filter((_, i) => i !== index);
    this.filtersChange.emit(this.filters);
  }

  toggleOperator() {
    this.operator =
      this.operator === SolrOperators.and ? SolrOperators.or : SolrOperators.and;
    this.operatorChange.emit(this.operator);
  }

  protected readonly SolrOperators = SolrOperators;
}
