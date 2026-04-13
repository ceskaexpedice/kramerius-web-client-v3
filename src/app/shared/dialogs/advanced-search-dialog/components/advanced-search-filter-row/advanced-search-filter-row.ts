import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  FilterElementType,
  FilterValue,
  isFilterWithCaseSensitiveSupport,
  SolrFacetKey,
} from '../../solr-filters';
import {AutocompleteComponent} from '../../../../components/autocomplete/autocomplete.component';
import {SelectComponent} from '../../../../components/select/select.component';
import {Observable, of} from 'rxjs';
import {SolrService} from '../../../../../core/solr/solr.service';
import {RangeSliderComponent} from '../../../../components/range-slider/range-slider.component';
import {TranslateService} from '@ngx-translate/core';
import {AdvancedDateFilterComponent} from '../advanced-date-filter/advanced-date-filter.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule, provideNativeDateAdapter} from '@angular/material/core';
import {InputComponent} from '../../../../components/input/input.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent, RangeSliderComponent, AdvancedDateFilterComponent, MatDatepickerModule,
    MatNativeDateModule, InputComponent, TranslatePipe],
  providers: [
    provideNativeDateAdapter(),
    MatDatepickerModule
  ],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss',
})
export class AdvancedSearchFilterRow implements OnInit {
  showCaseSensitiveButton = false;

  private solrService = inject(SolrService);
  private translateService = inject(TranslateService);

  @Input() filter!: AdvancedFilterDefinition;
  @Input() isMobile = false;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();
  @Output() addYearFilter = new EventEmitter<void>();

  filterTypes = ADVANCED_FILTERS;

  ngOnInit() {
    this.initializeValues();
    this.loadData();
    this.showCaseSensitiveButton = isFilterWithCaseSensitiveSupport(this.filter.solrField || '');
  }

  /** Ensure the filter always has a values array with at least one entry */
  private initializeValues() {
    if (!this.filter.values || this.filter.values.length === 0) {
      this.filter.values = [{
        elementValue: this.filter.elementValue || '',
        solrValue: this.filter.solrValue || '',
        caseSensitive: this.filter.caseSensitive,
      }];
    }
  }

  loadData() {
    if (this.filter.inputType === FilterElementType.Dropdown && this.filter.solrField) {
      const data = this.solrService.getSuggestionsByFacetKey(this.filter.solrField, '', -1);

      data.subscribe(suggestions => {
        const firstFour = suggestions.slice(0, 4);
        const rest = suggestions.slice(4).sort((a, b) => {
          const translatedA = this.translateService.instant(a);
          const translatedB = this.translateService.instant(b);
          return translatedA.toLowerCase().localeCompare(translatedB.toLowerCase());
        });

        const sorted = [...firstFour, ...rest];
        this.filter.options = sorted;

        // Set default value for the first entry if empty
        if (!this.filter.values![0].elementValue) {
          this.filter.values![0].elementValue = sorted[0];
          this.filter.values![0].solrValue = sorted[0];
        }
      });
    }
  }

  toggleEqualsOperator() {
    this.filter.isEquals = !this.filter.isEquals;
    this.emitChange();
  }

  selectedFilterTypeOption() {
    return this.filterTypes.find(f => f.key === this.filter.key) || this.filterTypes[0];
  }

  onFilterTypeChange(key: SolrFacetKey) {
    const def = this.filterTypes.find(f => f.key === key);
    if (def) {
      this.filter = {
        ...def,
        solrValue: '',
        values: [{ elementValue: '', solrValue: '' }],
      };
      this.showCaseSensitiveButton = isFilterWithCaseSensitiveSupport(this.filter.solrField || '');
      this.emitChange();
      this.focusValueInput();
    }
  }

  private focusValueInput(): void {
    const inputType = this.filter.inputType;

    setTimeout(() => {
      const filterRows = Array.from(document.querySelectorAll('advanced-search-filter-row'));

      for (const row of filterRows) {
        let el: HTMLInputElement | null = null;

        if (inputType === FilterElementType.Autocomplete) {
          el = row.querySelector('app-autocomplete input');
        } else if (inputType === FilterElementType.Text) {
          el = row.querySelector('app-input input');
        } else if (inputType === FilterElementType.Dropdown) {
          const selectWrapper = row.querySelector('.filter-wrapper > app-select:last-of-type .select-wrapper') as HTMLElement;
          selectWrapper?.click();
          return;
        }

        if (el && el.isConnected) {
          el.focus();
          return;
        }
      }
    }, 200);
  }

  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.filter.solrField) return of([]);
    return this.solrService.getSuggestionsByFacetKey(this.filter.solrField, term);
  };

  filterTypeDisplayFn = (option: AdvancedFilterDefinition | null) => option ? (option.label) : '';

  private syncPrimaryValue() {
    if (this.filter.values && this.filter.values.length > 0) {
      this.filter.elementValue = this.filter.values[0].elementValue;
      this.filter.solrValue = this.filter.values[0].solrValue;
      this.filter.caseSensitive = this.filter.values[0].caseSensitive;
    }
  }

  emitChange() {
    this.syncPrimaryValue();
    this.filterChange.emit({...this.filter, values: [...(this.filter.values || [])]});
  }

  // --- Multi-value methods ---

  addValue() {
    if (!this.filter.values) {
      this.filter.values = [];
    }
    this.filter.values.push({ elementValue: '', solrValue: '' });
    this.emitChange();
  }

  removeValue(index: number) {
    if (!this.filter.values) return;
    this.filter.values.splice(index, 1);
    if (this.filter.values.length === 0) {
      // If all values removed, remove the entire filter row
      this.remove.emit();
      return;
    }
    this.emitChange();
  }

  suggestionSelected(index: number, value: string) {
    this.filter.values![index].elementValue = value;
    this.filter.values![index].solrValue = value;
    this.emitChange();
  }

  autocompleteSubmit(index: number, value: string) {
    this.filter.values![index].elementValue = value;
    this.filter.values![index].solrValue = value;
  }

  inputChange(index: number, value: string | number) {
    this.filter.values![index].elementValue = value.toString();
    this.filter.values![index].solrValue = value.toString();
  }

  inputBlur() {
    this.emitChange();
  }

  onExactMatchToggle(index: number) {
    this.filter.values![index].caseSensitive = !this.filter.values![index].caseSensitive;
    this.emitChange();
  }

  onRangeSliderChange(index: number, range: { from: number; to: number }) {
    const val = `[${range.from} TO ${range.to}]`;
    this.filter.values![index].solrValue = val;
    this.filter.values![index].elementValue = val;
  }

  getInitialFrom(index: number): number {
    const match = this.filter.values![index].elementValue.match(/\[(\d+)\s+TO\s+(\d+)\]/);
    if (match) {
      return Number(match[1]);
    }
    return this.filter.meta?.min ?? 0;
  }

  getInitialTo(index: number): number {
    const match = this.filter.values![index].elementValue.match(/\[(\d+)\s+TO\s+(\d+)\]/);
    if (match) {
      return Number(match[2]);
    }
    return this.filter.meta?.max ?? 100;
  }

  onDateFilterChange(index: number, value: {elementValue: string, solrValue: string}) {
    this.filter.values![index].elementValue = value.elementValue;
    this.filter.values![index].solrValue = value.solrValue;
    this.emitChange();
  }

  onAddYearFilter() {
    this.addYearFilter.emit();
  }

  /** Whether this filter type supports adding multiple values */
  get supportsMultipleValues(): boolean {
    return this.filter.inputType === FilterElementType.Autocomplete
      || this.filter.inputType === FilterElementType.Text
      || this.filter.inputType === FilterElementType.Dropdown;
  }

  protected readonly AdvancedFilterType = FilterElementType;
}
