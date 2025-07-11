import {Component, EventEmitter, Input, Output} from '@angular/core';

@Component({
  selector: 'app-page-navigator',
  imports: [
  ],
  templateUrl: './page-navigator.component.html',
  styleUrl: './page-navigator.component.scss'
})
export class PageNavigatorComponent {

  @Input() currentPage = 1;
  @Input() totalPages = 1;

  @Output() prev = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() pageChange = new EventEmitter<number>();

  goPrev() {
    if (this.currentPage > 1) {
      this.prev.emit();
    }
  }

  goNext() {
    if (this.currentPage < this.totalPages) {
      this.next.emit();
    }
  }

  get currentPageString(): string {
    return this.currentPage.toString().padStart(2, '0');
  }

  get totalPagesString(): string {
    return this.totalPages.toString().padStart(2, '0');
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = parseInt(input.value, 10);

    if (!isNaN(value) && value >= 1 && value <= this.totalPages) {
      this.currentPage = value;
      this.pageChange.emit(this.currentPage - 1); // Emit page index (0-based)
    } else {
      (event.target as HTMLInputElement).value = this.currentPageString;
    }
  }

  onInputConfirm(event: Event): void {
    this.onInputChange(event);
  }

}
