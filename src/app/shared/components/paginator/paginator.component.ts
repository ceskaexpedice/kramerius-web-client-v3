import {Component, EventEmitter, Input, OnChanges, Output, signal, SimpleChanges} from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-paginator',
  imports: [NgForOf, NgIf],
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

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['totalCount'] || changes['pageSize'] || changes['page']) {
      this.generatePages();
    }
  }

  private generatePages(): void {
    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    const pages: number[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (this.page <= 3) {
        for (let i = 1; i <= 3; i++) {
          pages.push(i);
        }
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      } else if (this.page >= totalPages - 2) {
        pages.push(1);
        pages.push(-1); // Ellipsis
        for (let i = totalPages - 2; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push(-1); // Ellipsis
        pages.push(this.page);
        pages.push(this.page + 1);
        pages.push(-1); // Ellipsis
        pages.push(totalPages);
      }
    }

    this.pages.set(pages);
  }

  goToPage(page: number): void {
    const totalPages = Math.ceil(this.totalCount / this.pageSize);
    const clampedPage = Math.max(1, Math.min(page, totalPages));
    if (clampedPage !== this.page) {
      this.page = clampedPage;
      this.pageChange.emit(clampedPage);
    }
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = Number(target.value);

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
