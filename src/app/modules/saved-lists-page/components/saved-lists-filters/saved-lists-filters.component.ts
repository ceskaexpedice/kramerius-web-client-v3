import {Component} from '@angular/core';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetElementType,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-saved-lists-filters',
  standalone: true,
  styles: `


    .filter-section-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-base);
      margin-bottom: var(--spacing-x3);
    }
  `,
  imports: [
    AutocompleteComponent,
    TranslatePipe,
  ],
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search-in-periodicals--placeholder' | translate"
        [size]="'sm'"
        [minTermLength]="2"
        [showHelpButton]="false"
        [showMicrophoneButton]="false"
        [showSubmitButton]="false"

        [showHistorySuggestions]="true"
      >
      </app-autocomplete>

<!--      (suggestionSelected)="periodicalService.onSuggestionSelected($event)"
     (search)="periodicalService.onSearch($event)"
        [inputTerm]="periodicalService.searchTerm"
                [initialValue]="periodicalService.inputSearchTerm"
        [getSuggestions]="periodicalService.getSuggestionsFn"
-->


      <hr>

    </div>
  `,
})
export class SavedListsFiltersComponent extends BaseFiltersComponent {
  facetKeys = [];
  customDefinedFacetsKeys = [customDefinedFacetsEnum.accessibility];

  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
  protected readonly facetKeysEnum = facetKeysEnum;

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  get getFacetKeys(): string[] {
    // we are showing licenses under accessibility facet so we need to return all facet keys except 'licenses.facet'
    return [...this.customDefinedFacetsKeys, ...this.facetKeys].filter(key => key !== facetKeysEnum.license);
  }
}
