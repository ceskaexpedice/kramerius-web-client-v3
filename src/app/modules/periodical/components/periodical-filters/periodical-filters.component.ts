import { Component } from '@angular/core';
import { AsyncPipe, NgForOf } from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {InputComponent} from '../../../../shared/components/input/input.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';

@Component({
  selector: 'app-periodical-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, InputComponent, TranslatePipe, AutocompleteComponent],
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search-in-periodicals--placeholder' | translate"
        [size]="'sm'"
        [minTermLength]="2"
        [initialValue]="periodicalService.inputSearchTerm"
        [getSuggestions]="periodicalService.getSuggestionsFn"
        [showHelpButton]="false"
        [showMicrophoneButton]="false"
        [showSubmitButton]="false"
        (search)="periodicalService.onSearch($event)"
        (submit)="periodicalService.onSubmit($event)"
        [inputTerm]="periodicalService.searchTerm"
        [showHistorySuggestions]="true"
        (suggestionSelected)="periodicalService.onSuggestionSelected($event)">
      </app-autocomplete>

      <app-filter-category
        *ngFor="let facetKey of facetKeys"
        [facetKey]="facetKey"
        [label]="facetKey"
        [items]="(facets$ | async)?.[facetKey] || []"
        [selected]="selectedFilters"
        [operators]="(filterService.getFiltersWithOperators() | async) || {}"
        [showShowMoreButton]="true"
        (toggle)="onToggleFacet($event)">
      </app-filter-category>
    </div>
  `
})
export class PeriodicalFiltersComponent extends BaseFiltersComponent {
  facetKeys = ['years.facet', 'availability.facet'];
}
