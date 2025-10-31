import {Component, EventEmitter, inject, Input, OnInit, Output, OnChanges, SimpleChanges} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  changeFieldForExactMatch,
  FilterElementType, getOriginalSolrKey, isExactOn, isFilterWithCaseSensitiveSupport,
  SolrFacetKey,
} from '../../solr-filters';
import {AutocompleteComponent} from '../../../../components/autocomplete/autocomplete.component';
import {SelectComponent} from '../../../../components/select/select.component';
import {Observable, of} from 'rxjs';
import {SolrService} from '../../../../../core/solr/solr.service';
import {RangeSliderComponent} from '../../../../components/range-slider/range-slider.component';
import {TranslatePipe, TranslateService} from '@ngx-translate/core';
import {AdvancedDateFilterComponent} from '../advanced-date-filter/advanced-date-filter.component';
import {MatDatepickerModule} from '@angular/material/datepicker';
import {MatNativeDateModule, provideNativeDateAdapter} from '@angular/material/core';
import {InputComponent} from '../../../../components/input/input.component';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent, RangeSliderComponent, AdvancedDateFilterComponent, MatDatepickerModule,
    MatNativeDateModule, InputComponent, MatSlideToggle, TranslatePipe],
  providers: [
    provideNativeDateAdapter(),

    MatDatepickerModule],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss',
})
export class AdvancedSearchFilterRow implements OnInit {
  exactMatch = false;
  showCaseSensitiveButton = false;

  private solrService = inject(SolrService);
  private translateService = inject(TranslateService);

  @Input() filter!: AdvancedFilterDefinition;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();
  @Output() addYearFilter = new EventEmitter<void>();

  filterTypes = ADVANCED_FILTERS;

  ngOnInit() {

    this.loadData();

    this.showCaseSensitiveButton = isFilterWithCaseSensitiveSupport(this.filter.solrField || this.filter.key || '');
  }

  loadData() {
    this.checkFilterWithCaseSensitive();

    if (this.filter.inputType === FilterElementType.Dropdown && this.filter.solrField) {
      const data = this.solrService.getSuggestionsByFacetKey(this.filter.solrField, '', -1);

      data.subscribe(suggestions => {
        // sort suggestions, first 4 suggestions default order, then alphabetically
        const firstFour = suggestions.slice(0, 4); // Keep first 4 in original order
        const rest = suggestions.slice(4).sort((a, b) => {
          const translatedA = this.translateService.instant(a);
          const translatedB = this.translateService.instant(b);
          return translatedA.toLowerCase().localeCompare(translatedB.toLowerCase());
        });

        const sorted = [...firstFour, ...rest]; // Combine the two arrays

        this.filter.options = sorted;

        if (!this.filter.elementValue) {
          this.filter.elementValue = sorted[0];
        }
      });
    }
  }

  checkFilterWithCaseSensitive() {
    const isCaseSensitiveSupportFilter = isFilterWithCaseSensitiveSupport(this.filter.solrField || '');

    if (isCaseSensitiveSupportFilter) {
      const filter = ADVANCED_FILTERS.find(f => f.key === getOriginalSolrKey(this.filter.key));
      if (filter) {
        this.filter = {
          ...filter,
          solrField: this.filter.solrField,
          elementValue: this.filter.elementValue,
          solrValue: this.filter.solrValue
        };
      }

      this.exactMatch = isExactOn(this.filter.solrField || '');
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
    this.filterChange.emit({...this.filter});
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

  inputChange(value: string | number) {
    this.filter.elementValue = value.toString();
    this.filter.solrValue = value.toString();
  }

  inputBlur() {
    console.log('input blur')
    this.emitChange();
  }

  onExactMatchToggle() {
    this.exactMatch = !this.exactMatch;
    this.filter = changeFieldForExactMatch(this.filter, this.exactMatch);
    this.emitChange();
  }

  onRangeSliderChange(range: { from: number; to: number }) {
    this.filter.solrValue = `[${range.from} TO ${range.to}]`;
    this.filter.elementValue = `[${range.from} TO ${range.to}]`;
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

  protected readonly AdvancedFilterType = FilterElementType;



  onDateFilterChange(value: {elementValue: string, solrValue: string}) {
    this.filter.elementValue = value.elementValue;
    this.filter.solrValue = value.solrValue;
    this.emitChange();
  }

  onAddYearFilter() {
    this.addYearFilter.emit();
  }

}
