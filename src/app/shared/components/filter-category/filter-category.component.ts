import { Component, EventEmitter, Input, OnChanges, Output, signal, effect } from '@angular/core';
import { NgForOf, NgIf, SlicePipe } from '@angular/common';
import { FilterItemComponent } from '../filter-item/filter-item.component';
import { FacetItem } from '../../../modules/models/facet-item';
import { TranslatePipe } from '@ngx-translate/core';
import {
  FilterDialogComponent
} from '../../../modules/search-results-page/components/filter-dialog/filter-dialog.component';
import { ActivatedRoute } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { SearchService } from '../../services/search.service';
import { expandCollapseAnimation } from '../../animations';
import {
  customDefinedFacetsEnum, FacetAccessibilityTypes, FacetElementType,
  facetKeysEnum,
  facetKeysInfinityCount,
} from '../../../modules/search-results-page/const/facets';
import { LICENSES_ORDER } from '../../../core/solr/solr-misc';
import { CustomSearchService } from '../../services/custom-search.service';
import { FilterItemsRadioComponent } from '../filter-items-radio/filter-items-radio.component';
import { RangeSliderComponent } from '../range-slider/range-slider.component';
import { DatePickerComponent } from '../date-picker/date-picker.component';
import { FilterElementType } from '../../dialogs/advanced-search-dialog/solr-filters';
import { getModelColor, getLanguageFlagIcon } from '../../utils/filter-icons.utils';
import { SkeletonListPipe } from '../../pipes/skeleton-list.pipe';

@Component({
  selector: 'app-filter-category',
  imports: [
    FilterItemComponent,
    NgForOf,
    NgIf,
    TranslatePipe,
    SlicePipe,
    FilterItemsRadioComponent,
    RangeSliderComponent,
    DatePickerComponent,
    SkeletonListPipe
  ],
  templateUrl: './filter-category.component.html',
  styleUrl: './filter-category.component.scss',
  animations: [expandCollapseAnimation]
})
export class FilterCategoryComponent implements OnChanges {
  expanded = true;

  // specific for custom-where-to-search facet
  showPageFacet = false;
  showPeriodicalItemFacet = false;

  @Input() label!: string;
  @Input() facetKey!: string;
  @Input() items: FacetItem[] = [];
  @Input() selected: string[] = [];
  @Input() showShowMoreButton = false;
  @Input() operators: Record<string, string> = {};
  @Input() showToggleExpand = true;
  @Input() showBottomBorder = true;
  @Input() type: FacetElementType = FacetElementType.checkbox;
  @Input() loading = false;

  // Date range inputs
  @Input() dateFrom: Date | null = null;
  @Input() dateTo: Date | null = null;
  @Input() dateOffset: number = 0;

  // Year range inputs
  @Input() yearRangeMin: number = 1400;
  @Input() yearRangeMax: number = new Date().getFullYear();
  @Input() yearRangeFrom: number = 1400;
  @Input() yearRangeTo: number = new Date().getFullYear();

  @Output() toggle = new EventEmitter<string>();
  @Output() showMore = new EventEmitter<void>();
  @Output() datePickerChange = new EventEmitter<any>();
  @Output() rangeChange = new EventEmitter<any>();

  visibleItems = signal<FacetItem[]>([]);

  // Get max items based on facetKey
  get maxItems(): number {
    return facetKeysInfinityCount.includes(this.facetKey) ? Infinity : 5;
  }

  // Get whether to show the "Show all" button
  get shouldShowMoreButton(): boolean {
    // Don't show for 'model' facetKey, and only show if we have more items than maxItems
    const isFacetInInfinityCount = facetKeysInfinityCount.includes(this.facetKey);
    return !isFacetInInfinityCount && this.showShowMoreButton;
  }

  get hasAndOperator(): boolean {
    return this.operators[this.facetKey] === 'AND';
  }

  constructor(
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private searchService: SearchService,
    private customSearchService: CustomSearchService
  ) {

    effect(() => {
      if (this.facetKey === customDefinedFacetsEnum.whereToSearchModel) {
        this.showPageFacet = this.searchService.hasSubmittedQuery() || this.searchService.hasFulltextFilter();
        this.showPeriodicalItemFacet = this.searchService.filtersContainDate() || this.searchService.hasFulltextFilter();
        this.updateVisibleItems();
      }
    });

  }

  ngOnChanges() {
    this.updateVisibleItems();
  }

  private updateVisibleItems() {
    let allItems = [...this.items];

    const selectedValues = this.selected
      .filter(f => f.startsWith(this.facetKey + ':'))
      .map(f => f.split(':')[1]);

    const selectedSet = new Set(selectedValues);

    selectedValues.forEach(val => {
      if (!allItems.find(item => item.name === val)) {
        allItems.push({ name: val, count: 0 });
      }
    });

    let sorted;

    // Special handling for 'model' facet - preserve original order
    if (this.facetKey === facetKeysEnum.model || this.facetKey === customDefinedFacetsEnum.model || this.facetKey === customDefinedFacetsEnum.accessibility || this.facetKey === customDefinedFacetsEnum.whereToSearchModel) {
      sorted = allItems; // Keep original order for model facet
    } else if (this.facetKey === facetKeysEnum.license) {
      // Sort licenses by LICENSES_ORDER
      sorted = allItems.sort((a, b) => {
        const aIndex = LICENSES_ORDER.indexOf(a.name);
        const bIndex = LICENSES_ORDER.indexOf(b.name);
        // If not in order list, put at the end
        const aOrder = aIndex === -1 ? LICENSES_ORDER.length : aIndex;
        const bOrder = bIndex === -1 ? LICENSES_ORDER.length : bIndex;
        return aOrder - bOrder;
      });
    } else {
      // For all other facets, sort with selected items first
      sorted = allItems.sort((a, b) => {
        const aSelected = selectedSet.has(a.name) ? -1 : 0;
        const bSelected = selectedSet.has(b.name) ? -1 : 0;
        return aSelected - bSelected;
      });
    }

    // if facetKey is customDefinedFacetsEnum.whereToSearchModel, we
    // need to show only facet items without 'periodical' or 'page' in their name
    // if showPageFacet is true, we can show also 'page', similarly for 'periodical'
    if (this.facetKey === customDefinedFacetsEnum.whereToSearchModel) {
      sorted = sorted.filter(item => {
        if (this.showPageFacet && item.name === 'page') return true;
        if (this.showPeriodicalItemFacet && item.name === 'periodicalitem') return true;
        if (this.showPeriodicalItemFacet && item.name === 'periodicalvolume') return true;
        return !['periodicalitem', 'page', 'periodicalvolume'].includes(item.name);
      });
    }

    // Add colored dots for model facets
    if (this.facetKey === customDefinedFacetsEnum.model) {
      sorted = sorted.map(item => ({
        ...item,
        colorDot: getModelColor(item.name) || undefined
      }));
    }

    // Add flag icons for language facets
    if (this.facetKey === facetKeysEnum.languages) {
      sorted = sorted.map(item => ({
        ...item,
        icon: getLanguageFlagIcon(item.name) || undefined
      }));
    }

    this.visibleItems.set(sorted);
  }


  isSelected(value: string) {
    return this.selected.includes(`${this.facetKey}:${value}`);
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
  }

  onToggle(value: string) {
    this.toggle.emit(`${this.facetKey}:${value}`);
  }

  openFilterDialog(facetKey: string, facetLabel: string, items: FacetItem[]) {
    const selected = this.selected
      .filter(f => f.startsWith(facetKey + ':'))
      .map(f => f.split(':')[1]);

    const dialogRef = this.dialog.open(FilterDialogComponent, {
      width: '600px',
      data: { facetKey, facetLabel, items, selected }
    });

    dialogRef.afterClosed().subscribe((selectedValues: string[]) => {
      if (selectedValues) {
        this.searchService.updateFilters(
          this.route,
          facetKey,
          selectedValues
        );
      }
    });
  }

  getSelectedRadioValue(): string | null {
    if (this.facetKey === customDefinedFacetsEnum.accessibility) {
      return this.customSearchService.getSelectedFilterValue(this.facetKey) || FacetAccessibilityTypes.all;
    }

    return null;
  }

  onRadioChange(value: string) {
    if (this.facetKey === customDefinedFacetsEnum.accessibility) {
      if (value === FacetAccessibilityTypes.all) {
        this.customSearchService.removeAllFiltersByFacetKey(this.facetKey);
      } else {
        // For radio buttons, we need to remove any existing selection first
        // then add the new value
        this.customSearchService.removeAllFiltersByFacetKey(this.facetKey);
        this.customSearchService.addFilter(`${this.facetKey}:${value}`);
      }
    }
  }

  // Date range methods
  getDateFrom(): Date | null {
    return this.dateFrom;
  }

  getDateTo(): Date | null {
    return this.dateTo;
  }

  getDateOffset(): number {
    return this.dateOffset;
  }

  onDatePickerChange(event: any) {
    this.datePickerChange.emit(event);
  }

  // Year range methods
  getRangeMin(): number {
    return this.yearRangeMin;
  }

  getRangeMax(): number {
    return this.yearRangeMax;
  }

  getRangeFrom(): number {
    return this.yearRangeFrom;
  }

  getRangeTo(): number {
    return this.yearRangeTo;
  }

  onRangeChange(event: any) {
    this.rangeChange.emit(event);
  }

  // TrackBy function to prevent unnecessary rerenders
  trackByItemName(index: number, item: FacetItem): string {
    return item.name;
  }

  protected readonly AdvancedFilterType = FilterElementType;
}
