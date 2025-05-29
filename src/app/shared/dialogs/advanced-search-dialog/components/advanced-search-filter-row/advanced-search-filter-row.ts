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
import {DateStepperChange, DateStepperComponent} from '../../../../date-stepper/date-stepper.component';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent, RangeSliderComponent, DateStepperComponent],
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
        solrValue: ''
      };
      this.emitChange();
    }
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.filter.solrField) return of([]);

    return this.solrService.getSuggestionsByFacetKey(this.filter.solrField, term);
  };

  filterTypeDisplayFn = (option: AdvancedFilterDefinition | null) => option ? (option.label) : '';

  emitChange() {
    this.filterChange.emit({ ...this.filter });
  }

  suggestionSelected(value: string) {
    this.filter.elementValue = value;
    this.filter.solrValue = value;
    this.emitChange();
  }

  autocompleteSubmit(value: string) {
    this.filter.elementValue = value;
    this.filter.solrValue = value;
  }

  onRangeSliderChange(range: { from: number; to: number }) {
    this.filter.solrValue = `[${range.from} TO ${range.to}]`;
    this.filter.elementValue = `[${range.from} TO ${range.to}]`;
  }

  onDateChange(date: DateStepperChange) {
    console.log('date changed:', date);
    const formattedDate = date.date.toISOString().split('T')[0];
    this.filter.elementValue = `${formattedDate}${date.offset ? `+${date.offset}` : ''}`
    // solr value format is [start TO end] so we need to take date, calculate the start and end dates with offset
    const startDate = new Date(date.date);
    startDate.setHours(0, 0, 0, 0);
    // If offset is provided, the end date is start date plus offset in days
    const endDate = new Date(startDate);
    if (date.offset) {
      endDate.setDate(endDate.getDate() + date.offset);
    } else {
      endDate.setDate(endDate.getDate() + 1); // Default to next day if no offset
    }
    this.filter.solrValue = `[${startDate.toISOString()} TO ${endDate.toISOString()}]`;
  }

  getInitialFrom(): number {
    const match = this.filter.elementValue.match(/\[(\d+)\s+TO\s+(\d+)\]/);
    if (match) {
      return Number(match[1]);
    }
    return this.filter.meta?.min ?? 0;
  }

  getInitialTo(): number {
    const match = this.filter.elementValue.match(/\[(\d+)\s+TO\s+(\d+)\]/);
    if (match) {
      return Number(match[2]);
    }
    return this.filter.meta?.max ?? 100;
  }

  protected readonly AdvancedFilterType = AdvancedFilterType;

}
