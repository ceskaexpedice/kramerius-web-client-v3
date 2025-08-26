import {Component, inject} from '@angular/core';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';
import {
  CollapsibleCategoryComponent
} from '../../../../shared/components/collapsible-category/collapsible-category.component';
import {selectAllFolders} from '../../state';
import {Store} from '@ngrx/store';
import {AsyncPipe} from '@angular/common';

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
    CollapsibleCategoryComponent,
    AsyncPipe,
  ],
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search-in-saved-list--placeholder' | translate"
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

      <app-collapsible-category
        [label]="'my-favorites-list--title' | translate"
        [labelIcon]="'icon-heart'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of folders | async; track folder.uuid) {
          <div class="filter-section-title">
            {{ folder.name }} ({{folder.itemsCount}})
          </div>
        }

      </app-collapsible-category>

    </div>
  `,
})
export class SavedListsFiltersComponent {

  private store = inject(Store);

  folders = this.store.select(selectAllFolders);

}
