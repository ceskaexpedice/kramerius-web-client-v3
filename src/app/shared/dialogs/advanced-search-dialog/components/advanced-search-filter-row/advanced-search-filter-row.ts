import {Component, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {CommonModule} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  SolrFacetKey,
  FilterElementType,
} from '../../solr-filters';
import {AutocompleteComponent} from '../../../../components/autocomplete/autocomplete.component';
import {SelectComponent} from '../../../../components/select/select.component';
import {Observable, of} from 'rxjs';
import {SolrService} from '../../../../../core/solr/solr.service';
import {RangeSliderComponent} from '../../../../components/range-slider/range-slider.component';
import {DateStepperChange} from '../../../../date-stepper/date-stepper.component';
import {TranslateService} from '@ngx-translate/core';
import {DatePickerComponent} from '../../../../components/date-picker/date-picker.component';
import {
  MatDatepickerModule,
} from '@angular/material/datepicker';
import {MatNativeDateModule, provideNativeDateAdapter} from '@angular/material/core';

@Component({
  selector: 'advanced-search-filter-row',
  imports: [CommonModule, FormsModule, AutocompleteComponent, SelectComponent, RangeSliderComponent, DatePickerComponent, MatDatepickerModule,
    MatNativeDateModule],
  providers: [
    provideNativeDateAdapter(),

    MatDatepickerModule],
  templateUrl: './advanced-search-filter-row.html',
  styleUrl: './advanced-search-filter-row.scss',
})
export class AdvancedSearchFilterRow implements OnInit {
  private solrService = inject(SolrService);
  private translateService = inject(TranslateService);

  @Input() filter!: AdvancedFilterDefinition;
  @Output() filterChange = new EventEmitter<AdvancedFilterDefinition>();
  @Output() remove = new EventEmitter<void>();

  // Date range inputs
  dateFrom: Date | null = null;
  dateTo: Date | null = null;
  dateOffset: number = 0;

  filterTypes = ADVANCED_FILTERS;

  ngOnInit() {

    this.loadData();

  }

  loadData() {
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

  onRangeSliderChange(range: { from: number; to: number }) {
    this.filter.solrValue = `[${range.from} TO ${range.to}]`;
    this.filter.elementValue = `[${range.from} TO ${range.to}]`;
  }

  onDateChange(date: DateStepperChange) {
    console.log('date changed:', date);
    // if date.offset is -1 it means type is range so we have both dateFrom and dateTo and we can store them as [dateFrom TO dateTo], otherwise we store it as dateFrom+offset
    if (date.offset === -1 && date.dateTo) {
      this.filter.elementValue = `[${date.dateFrom.toISOString()} TO ${date.dateTo.toISOString()}]`;
      this.filter.solrValue = `[${date.dateFrom.toISOString()} TO ${date.dateTo.toISOString()}]`;
      return;
    }
    const formattedDate = date.dateFrom.toISOString().split('T')[0];
    this.filter.elementValue = `${formattedDate}+${date.offset}`
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

  getDateFrom(): Date | null {
    if (this.dateFrom) {
      return this.dateFrom;
    }

    // Parse from filter.elementValue if available
    const parsed = this.parseFromString(this.filter.elementValue);
    if (parsed) {
      this.dateFrom = parsed.dateFrom;
      return parsed.dateFrom;
    }

    return null;
  }

  getDateTo(): Date | null {
    if (this.dateTo) {
      return this.dateTo;
    }

    // Parse from filter.elementValue if available
    const parsed = this.parseFromString(this.filter.elementValue);
    if (parsed) {
      this.dateTo = parsed.dateTo || null;
      return parsed.dateTo || null;
    }

    return null;
  }

  getDateOffset(): number {
    if (this.dateOffset !== 0) {
      return this.dateOffset;
    }

    // Parse from filter.elementValue if available
    const parsed = this.parseFromString(this.filter.elementValue);
    if (parsed) {
      this.dateOffset = parsed.offset;
      return parsed.offset;
    }

    return 0;
  }

  onDatePickerChange(event: any) {
    console.log('date picker changed:', event);
    
    if (!event || !event.dateFrom) {
      return;
    }

    // Update local state
    this.dateFrom = event.dateFrom;
    this.dateTo = event.dateTo;
    this.dateOffset = event.offset;

    // Handle different cases similar to the date-stepper logic
    if (event.offset === 0 && event.dateTo) {
      // Range mode - store as [dateFrom TO dateTo]
      this.filter.elementValue = `[${event.dateFrom.toISOString()} TO ${event.dateTo.toISOString()}]`;
      this.filter.solrValue = `[${event.dateFrom.toISOString()} TO ${event.dateTo.toISOString()}]`;
    } else if (event.offset > 0) {
      // Offset mode - store as dateFrom+offset  
      const formattedDate = event.dateFrom.toISOString().split('T')[0];
      this.filter.elementValue = `${formattedDate}+${event.offset}`;
      this.filter.solrValue = `${formattedDate}+${event.offset}`;
    } else {
      // Single date - store as dateFrom+0
      const formattedDate = event.dateFrom.toISOString().split('T')[0];
      this.filter.elementValue = `${formattedDate}+0`;
      this.filter.solrValue = `${formattedDate}+0`;
    }

    this.emitChange();
  }

  private parseFromString(dateString: string): { dateFrom: Date; dateTo?: Date; offset: number } | null {
    if (!dateString) {
      return null;
    }

    const singleDatePattern = /^(\d{4})-(\d{2})-(\d{2})\+(-?\d+)$/;
    const rangePattern = /^\[([0-9T:\-\.Z]+)\s+TO\s+([0-9T:\-\.Z]+)\]$/;

    const singleMatch = dateString.match(singleDatePattern);
    const rangeMatch = dateString.match(rangePattern);

    if (singleMatch) {
      const [, yearStr, monthStr, dayStr, offsetStr] = singleMatch;
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const offset = parseInt(offsetStr, 10);

      const isValid = !isNaN(year) && !isNaN(month) && !isNaN(day) && !isNaN(offset);
      if (!isValid) {
        console.warn('Parsed values are invalid (single date):', { year, month, day, offset });
        return null;
      }

      const dateFrom = new Date(Date.UTC(year, month - 1, day));
      return { dateFrom, offset };
    }

    if (rangeMatch) {
      const [, fromStr, toStr] = rangeMatch;

      const fromDate = new Date(fromStr);
      const toDate = new Date(toStr);

      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        console.warn('Invalid date range values:', { fromStr, toStr });
        return null;
      }

      return { dateFrom: fromDate, dateTo: toDate, offset: 0 };
    }

    console.warn('Invalid date string format:', dateString);
    return null;
  }

}
