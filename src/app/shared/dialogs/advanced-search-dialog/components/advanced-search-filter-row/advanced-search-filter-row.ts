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

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss'
})
export class AdvancedSearchFilterRow implements OnInit {
  private solrService = inject(SolrService);

  @Input() filter!: AdvancedFilterDefinition;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();

  filterTypes = ADVANCED_FILTERS;
  options: Record<string, string[]> = {
    doctype: ['Periodikum', 'Knihy', 'Mapy', 'Grafiky', 'Archivalie', 'Rukopisy']
  };

  ngOnInit() {
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

  protected readonly AdvancedFilterType = AdvancedFilterType;
}
