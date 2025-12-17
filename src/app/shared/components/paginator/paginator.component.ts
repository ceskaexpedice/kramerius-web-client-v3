import { Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges } from '@angular/core';
import { NgForOf, NgIf } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { SelectComponent } from '../select/select.component';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-paginator',
  imports: [NgForOf, NgIf, SelectComponent, TranslatePipe],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss'
})
export class PaginatorComponent implements OnChanges {
  pages = signal<number[]>([]);

  @Input() page = 1;
  @Input() totalCount = 0;
  @Input() pageSize = 25;
  @Input() pageSizeOptions = [25, 50, 100, 200, 500];
  @Input() showPageSizeOptions = true;
  @Input() showOnlyArrows = false;
  @Input() disabledPagination = false;
  @Input() disabledPageSize = false;

  @Input() layout: 'normal' | 'compact' = 'normal';

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalCount'] || changes['pageSize'] || changes['page'] || changes['layout']) {
      this.generatePages();
    }
  }

  private generatePages(): void {
    const totalPages = Math.max(1, Math.ceil(this.totalCount / this.pageSize));
    const pages: number[] = [];
    const last = totalPages;

    if (this.layout === 'compact') {
      pages.push(this.page);
      if (this.page < last) {
        if (this.page < last - 1) {
          pages.push(-2); // Right Ellipsis
        }
        pages.push(last);
      }
    } else {
      // Normal Mode
      const delta = 1; // Number of pages around current to show
      const left = this.page - delta;
      const right = this.page + delta;
      const range: number[] = [];
      const rangeWithDots: number[] = [];
      let l: number | undefined;

      for (let i = 1; i <= last; i++) {
        if (i === 1 || i === last || (i >= left && i <= right)) {
          range.push(i);
        }
      }

      for (const i of range) {
        if (l) {
          if (i - l === 2) {
            rangeWithDots.push(l + 1);
          } else if (i - l !== 1) {
            // Determine if it's left or right ellipsis based on position
            if (i < this.page) {
              rangeWithDots.push(-1); // Left Ellipsis
            } else {
              rangeWithDots.push(-2); // Right Ellipsis
            }
          }
        }
        rangeWithDots.push(i);
        l = i;
      }

      // Copy to pages
      pages.push(...rangeWithDots);
    }

    this.pages.set(pages);
  }

  jump(offset: number): void {
    const newPage = this.page + offset;
    this.goToPage(newPage);
  }



  goToPage(page: number): void {
    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    if (clampedPage !== this.page) {
      this.page = clampedPage;
      this.pageChange.emit(clampedPage);
    }
  }

  changePageSize(newSize: number): void {
    if (newSize !== this.pageSize) {
      this.pageSize = newSize;
      this.pageSizeChange.emit(newSize);
      this.goToPage(1); // Reset to the first page
    }
  }

  lastPage(): number {
    return Math.ceil(this.totalCount / this.pageSize);
  }

}
