import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import {NgForOf, NgIf} from '@angular/common';

@Component({
  selector: 'app-paginator',
  imports: [NgForOf, NgIf],
  templateUrl: './paginator.component.html',
  styleUrl: './paginator.component.scss'
})
export class PaginatorComponent {
  @Input() page = signal(1);
  @Input() totalPages = signal(1);
  @Input() pageSize = signal(25);
  @Input() pageSizeOptions = [25, 50, 100, 200, 500];
  @Input() showPageSizeOptions = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  goToPage(p: number) {
    if (p >= 1 && p <= this.totalPages()) {
      this.page.set(p);
      this.pageChange.emit(p);
    }
  }

  changePageSize(e: Event) {
    const target = e.target as HTMLSelectElement;
    const size = Number(target.value);

    this.pageSize.set(size);
    this.pageSizeChange.emit(size);
    this.goToPage(1); // reset to first page
  }
}
