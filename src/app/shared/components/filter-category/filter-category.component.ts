import { Component, EventEmitter, Input, Output } from '@angular/core';
import {NgForOf, NgIf, SlicePipe} from '@angular/common';
import {FilterItemComponent} from '../filter-item/filter-item.component';
import {FacetItem} from '../../../modules/models/facet-item';
import {TranslatePipe} from '@ngx-translate/core';
import {
  FilterDialogComponent
} from '../../../modules/search-results-page/components/filter-dialog/filter-dialog.component';
import {ActivatedRoute, Router} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';

@Component({
  selector: 'app-filter-category',
  imports: [
    SlicePipe,
    FilterItemComponent,
    NgForOf,
    NgIf,
    TranslatePipe,
  ],
  templateUrl: './filter-category.component.html',
  styleUrl: './filter-category.component.scss'
})
export class FilterCategoryComponent {
  @Input() label!: string;
  @Input() facetKey!: string;
  @Input() items: FacetItem[] = [];
  @Input() selected: string[] = [];
  @Input() showShowMoreButton = false;

  @Output() toggle = new EventEmitter<string>();
  @Output() showMore = new EventEmitter<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private dialog: MatDialog
  ) {
  }

  isSelected(value: string) {
    return this.selected.includes(`${this.facetKey}:${value}`);
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
        const newFilters = [
          ...this.selected.filter(f => !f.startsWith(facetKey + ':')),
          ...selectedValues.map(v => `${facetKey}:${v}`)
        ];
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { fq: newFilters },
          queryParamsHandling: 'merge'
        });
      }
    });
  }
}
