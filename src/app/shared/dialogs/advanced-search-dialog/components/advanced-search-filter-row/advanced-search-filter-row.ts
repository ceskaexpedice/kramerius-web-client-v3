import {Component, Input, Output, EventEmitter, computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  AdvancedFilterKey,
  AdvancedFilterType,
} from '../../advanced-filters';
import {AutocompleteComponent} from '../../../../components/autocomplete/autocomplete.component';
import {SelectComponent} from '../../../../components/select/select.component';
import {Observable} from 'rxjs';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss'
})
export class AdvancedSearchFilterRow {
  @Input() filter!: AdvancedFilterDefinition;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();

  filterTypes = ADVANCED_FILTERS;
  options: Record<string, string[]> = {
    doctype: ['Periodikum', 'Knihy', 'Mapy', 'Grafiky', 'Archivalie', 'Rukopisy']
  };

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
    console.log('[SearchService] getting suggestions for:', term);
    // return this.solrService.getAutocompleteSuggestions(term);
    return new Observable<string[]>(subscriber => {
      setTimeout(() => {
        subscriber.next(this.options[this.filter.key] || []);
        subscriber.complete();
      }, 1000);
    });
  }

  filterTypeDisplayFn = (option: AdvancedFilterDefinition | null) => option ? option.label : '';

  emitChange() {
    this.filterChange.emit({ ...this.filter });
  }

  protected readonly AdvancedFilterType = AdvancedFilterType;
}
