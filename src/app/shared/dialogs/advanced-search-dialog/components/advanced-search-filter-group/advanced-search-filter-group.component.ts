import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {AdvancedSearchFilterRow} from '../advanced-search-filter-row/advanced-search-filter-row';
import {NgForOf} from '@angular/common';
import {SolrOperators} from '../../../../../core/solr/solr-helpers';
import {AdvancedFilterDefinition} from '../../advanced-filters';

@Component({
  selector: 'advanced-search-filter-group',
  imports: [
    AdvancedSearchFilterRow,
    NgForOf,
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

  ngOnInit() {
    if (this.filters.length === 0) {
      this.addFilter();
    }
  }

  addFilter() {
    this.filters = [...this.filters, new AdvancedFilterDefinition()];
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

  setOperator(op: SolrOperators) {
    this.operator = op;
    this.operatorChange.emit(op);
  }

  protected readonly SolrOperators = SolrOperators;
}
