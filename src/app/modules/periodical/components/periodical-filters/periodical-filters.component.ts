import {Component, inject} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { BaseFiltersComponent } from '../../../../shared/components/filters/base-filters.component';
import {TranslatePipe} from '@ngx-translate/core';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {
  customDefinedFacets,
  customDefinedFacetsEnum,
  FacetElementType,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';
import {PeriodicalService} from '../../../../shared/services/periodical.service';

@Component({
  selector: 'app-periodical-filters',
  standalone: true,
  imports: [AsyncPipe, NgForOf, FilterCategoryComponent, TranslatePipe, AutocompleteComponent, NgIf],
  styles: `
    .show-licenses--header {
      display: flex;
      align-items: center;
      cursor: pointer;
      gap: var(--spacing-x2);
      color: var(--color-text-base);
      margin-top: var(--spacing-x4);
      font-size: 13px;
      font-weight: 500;

      i {
        transition: transform 0.3s ease;
        transform: rotate(180deg);
      }

      &.expanded i {
        transform: rotate(0deg);
      }
    }
  `,
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
        [inputTerm]="periodicalService.searchTerm"
        [showHistorySuggestions]="true"
        (suggestionSelected)="periodicalService.onSuggestionSelected($event)">
      </app-autocomplete>

      <hr>

      <ng-container
        *ngFor="let facetKey of getFacetKeys"
      >
        <app-filter-category
          [label]="facetKey"
          [facetKey]="facetKey"
          [items]="(facets$ | async)?.[facetKey] || []"
          [selected]="selectedFilters"
          [operators]="(filterService.getFiltersWithOperators() | async) || {}"
          [showShowMoreButton]="true"
          [type]="getElementTypeByFacetKey(facetKey)"
          (toggle)="onToggleFacet($event)">

          <ng-container categoryContent *ngIf="facetKey === customDefinedFacetsEnum.accessibility">

            <div class="show-licenses--header" [class.expanded]="expandLicenses" (click)="toggleLicenses()">
              {{ 'show-licenses-label' | translate }} <i class="icon-arrow-up-1"></i>
            </div>

            <app-filter-category
              *ngIf="expandLicenses"
              [facetKey]="facetKeysEnum.license"
              [items]="(facets$ | async)?.[facetKeysEnum.license] || []"
              [selected]="selectedFilters"
              [operators]="(filterService.getFiltersWithOperators() | async) || {}"
              [showShowMoreButton]="false"
              [showBottomBorder]="false"
              [showToggleExpand]="false"
              (toggle)="onToggleFacet($event)">
            </app-filter-category>

          </ng-container>

        </app-filter-category>

      </ng-container>

    </div>
  `
})
export class PeriodicalFiltersComponent extends BaseFiltersComponent {
  expandLicenses = false;

  public periodicalService = inject(PeriodicalService);

  facetKeys = [];
  customDefinedFacetsKeys = [customDefinedFacetsEnum.accessibility];

  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
  protected readonly facetKeysEnum = facetKeysEnum;

  toggleLicenses() {
    this.expandLicenses = !this.expandLicenses;
  }

  getElementTypeByFacetKey(facetKey: string): FacetElementType {
    const facet = customDefinedFacets.find(f => f.facetKey === facetKey);
    return facet?.type || FacetElementType.checkbox;
  }

  get getFacetKeys(): string[] {
    // we are showing licenses under accessibility facet so we need to return all facet keys except 'licenses.facet'
    return [...this.customDefinedFacetsKeys, ...this.facetKeys].filter(key => key !== facetKeysEnum.license);
  }
}
