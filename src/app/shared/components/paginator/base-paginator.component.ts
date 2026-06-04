import { Directive, EventEmitter, Output, Signal, signal, computed } from '@angular/core';

@Directive()
export abstract class BasePaginatorComponent {
  page = 1;
  pageSize = 10;
  totalCount = 0;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  readonly totalPages: Signal<number> = computed(() =>
    Math.ceil(this.totalCount / this.pageSize) || 1
  );

  // Index (1-based) of the first / last item shown on the current page.
  // Used for screen-reader announcements ("showing X to Y of Z").
  get resultStart(): number { return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1; }
  get resultEnd(): number { return Math.min(this.page * this.pageSize, this.totalCount); }

  goToPage(p: number): void {
    const page = Math.max(1, Math.min(p, this.totalPages()));
    console.log('gotopage', p, page)
    if (page !== this.page) {
      this.page = page;
      this.pageChange.emit(page);
    }
  }

  changePageSize(newSize: number): void {
    if (newSize !== this.pageSize) {
      this.pageSize = newSize;
      this.pageSizeChange.emit(newSize);
      this.page = 1;
      this.pageChange.emit(1);
    }
  }
}
