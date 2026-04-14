import { Component, OnInit, OnDestroy, Inject } from '@angular/core';
import { AsyncPipe, NgIf } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { TranslatePipe } from '@ngx-translate/core';

import { FilterCategoryComponent } from '../../../../shared/components/filter-category/filter-category.component';
import { AutocompleteComponent } from '../../../../shared/components/autocomplete/autocomplete.component';
import {
  customDefinedFacetsEnum,
  FacetElementType,
  facetKeysEnum,
} from '../../../search-results-page/const/facets';
import { FILTER_SERVICE, FilterService } from '../../../../shared/services/filter.service';
import { MonographVolumesService } from '../../../../shared/services/monograph-volumes.service';

@Component({
  selector: 'app-monograph-filters',
  standalone: true,
  imports: [AsyncPipe, FilterCategoryComponent, AutocompleteComponent, NgIf, TranslatePipe],
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search' | translate"
        [size]="'sm'"
        [minTermLength]="2"
        [initialValue]="monographVolumesService.inputSearchTerm"
        [getSuggestions]="monographVolumesService.getSuggestionsFn"
        [showHelpButton]="false"
        [showMicrophoneButton]="true"
        [showSubmitButton]="false"
        (search)="monographVolumesService.onSearch($event)"
        [inputTerm]="monographVolumesService.searchTerm"
        [showHistorySuggestions]="true"
        (suggestionSelected)="monographVolumesService.onSuggestionSelected($event)">
      </app-autocomplete>

      <hr>

      <ng-container>
        <app-filter-category
          [label]="customDefinedFacetsEnum.accessibility"
          [facetKey]="customDefinedFacetsEnum.accessibility"
          [items]="(facets$ | async)?.[customDefinedFacetsEnum.accessibility] || []"
          [selected]="selectedFilters"
          [operators]="{}"
          [showShowMoreButton]="true"
          [type]="FacetElementType.radio"
          (toggle)="onToggleFacet($event)">

          <ng-container>

            <div class="show-licenses--header" [class.expanded]="expandLicenses" (click)="toggleLicenses()">
              {{ expandLicenses ? ('hide-licenses-label' | translate) : ('show-licenses-label' | translate) }} <i class="icon-arrow-up-1"></i>
            </div>

            <app-filter-category
              *ngIf="expandLicenses"
              [facetKey]="facetKeysEnum.license"
              [items]="(facets$ | async)?.[facetKeysEnum.license] || []"
              [selected]="selectedFilters"
              [operators]="{}"
              [showShowMoreButton]="false"
              [showBottomBorder]="false"
              [showToggleExpand]="false"
              (toggle)="onToggleFacet($event)">
            </app-filter-category>

          </ng-container>

        </app-filter-category>

      </ng-container>

    </div>

  `,
  styles: [`
      .show-licenses--header {
        display: flex;
        align-items: center;
        cursor: pointer;
        gap: var(--spacing-x2);
        color: var(--color-text-base);
        margin-top: var(--spacing-x4);
        font-size: var(--font-size-small);
        font-weight: 500;

        i {
          transition: transform 0.3s ease;
          transform: rotate(180deg);
        }

        &.expanded i {
          transform: rotate(0deg);
        }
      }

      .filters-content {
        display: flex;
        flex-direction: column;
      }
  `]
})
export class MonographFiltersComponent implements OnInit, OnDestroy {
  facets$: Observable<any> = new Observable<any>();
  selectedFilters: string[] = [];
  expandLicenses = false;

  private subscriptions: Subscription[] = [];

  protected readonly customDefinedFacetsEnum = customDefinedFacetsEnum;
  protected readonly facetKeysEnum = facetKeysEnum;
  protected readonly FacetElementType = FacetElementType;

  constructor(
    private route: ActivatedRoute,
    @Inject(FILTER_SERVICE) private filterService: FilterService,
    public monographVolumesService: MonographVolumesService,
  ) {}

  ngOnInit() {
    // Get facets from filter service
    this.facets$ = this.filterService.getFacets();

    // Initialize filters from route
    this.initializeFilters();

    // Check if some licenses are selected
    this.checkIfSomeOfLicensesSelected();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private initializeFilters(): void {
    this.route.queryParams.subscribe(params => {
      const fq = params['fq'];
      const fqFilters = Array.isArray(fq) ? fq : fq ? [fq] : [];

      const customRaw = params['customSearch'];
      const customFilters = Array.isArray(customRaw)
        ? customRaw
        : customRaw
          ? customRaw.split(',')
          : [];

      this.selectedFilters = [...fqFilters, ...customFilters];
    });
  }

  checkIfSomeOfLicensesSelected() {
    const selected = this.selectedFilters.some(filter => {
      const [facetKey] = filter.split(':');
      return facetKey === facetKeysEnum.license;
    });

    this.expandLicenses = selected;
  }

  onToggleFacet(fullValue: string): void {
    console.log('Toggle facet:', fullValue);
    this.filterService.resetPage();
    this.filterService.toggleFilter(this.route, fullValue);
  }

  toggleLicenses() {
    this.expandLicenses = !this.expandLicenses;
  }
}
