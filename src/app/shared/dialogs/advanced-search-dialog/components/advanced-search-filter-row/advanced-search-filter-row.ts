import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  AdvancedFilterKey,
  AdvancedFilterType,
} from '../../advanced-filters';
import {AutocompleteComponent} from '../../../../components/autocomplete/autocomplete.component';
import {SelectComponent} from '../../../../components/select/select.component';
import {Observable, of} from 'rxjs';
import {SolrService} from '../../../../../core/solr/solr.service';
import {RangeSliderComponent} from '../../../../components/range-slider/range-slider.component';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent, RangeSliderComponent],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss'
})
export class AdvancedSearchFilterRow implements OnInit {
  private solrService = inject(SolrService);

  @Input() filter!: AdvancedFilterDefinition;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();

  filterTypes = ADVANCED_FILTERS;

  ngOnInit() {

    this.loadData();

  }

  loadData() {
    if (this.filter.inputType === AdvancedFilterType.Dropdown && this.filter.solrField) {
      const data = this.solrService.getSuggestionsByFacetKey(this.filter.solrField, '');

      data.subscribe(suggestions => {
        this.filter.options = suggestions;
      });
    }

  }

  selectedFilterTypeOption() {
    return this.filterTypes.find(f => f.key === this.filter.key) || this.filterTypes[0];
  }

  onFilterTypeChange(key: AdvancedFilterKey) {
    const def = this.filterTypes.find(f => f.key === key);
    if (def) {
      this.filter = {
        ...def,
        value: ''
      };
      this.emitChange();
    }
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.filter.solrField) return of([]);

    return this.solrService.getSuggestionsByFacetKey(this.filter.solrField, term);
  };

  filterTypeDisplayFn = (option: AdvancedFilterDefinition | null) => option ? (option.label + (option.solrField && option.inputType === AdvancedFilterType.Autocomplete ? '*' : '')) : '';

  emitChange() {
    this.filterChange.emit({ ...this.filter });
  }

  suggestionSelected(value: string) {
    this.filter.value = value;
    this.emitChange();
  }

  onRangeSliderChange(range: { from: number; to: number }) {
    this.filter.value = `[${range.from} TO ${range.to}]`;
  }

  getInitialFrom(): number {
    if (typeof this.filter.value === 'string') {
      const match = this.filter.value.match(/\[(\d+)\s+TO\s+(\d+)\]/);
      if (match) {
        return Number(match[1]);
      }
    }
    return this.filter.meta?.min ?? 0;
  }

  getInitialTo(): number {
    if (typeof this.filter.value === 'string') {
      const match = this.filter.value.match(/\[(\d+)\s+TO\s+(\d+)\]/);
      if (match) {
        return Number(match[2]);
      }
    }
    return this.filter.meta?.max ?? 100;
  }

  protected readonly AdvancedFilterType = AdvancedFilterType;

}
