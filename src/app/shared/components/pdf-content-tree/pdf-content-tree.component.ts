import {ChangeDetectorRef, Component, inject, OnDestroy, OnInit} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {NgFor, NgIf} from '@angular/common';
import {Subscription} from 'rxjs';

export interface PdfOutlineItem {
  title: string;
  page: number;
  items?: PdfOutlineItem[];
  expanded?: boolean;
}

@Component({
  selector: 'app-pdf-content-tree',
  imports: [NgFor, NgIf],
  templateUrl: './pdf-content-tree.component.html',
  styleUrl: './pdf-content-tree.component.scss'
})
export class PdfContentTreeComponent implements OnInit, OnDestroy {
  public pdfService = inject(PdfService);
  private cdr = inject(ChangeDetectorRef);
  public outlineItems: PdfOutlineItem[] = [];
  public currentPage: number = 1;
  private subscriptions: Subscription[] = [];

  ngOnInit(): void {
    const outlineSub = this.pdfService.outline$.subscribe(outline => {
      this.outlineItems = outline || [];
      // Trigger change detection manually
      this.cdr.detectChanges();
    });
    this.subscriptions.push(outlineSub);

    // Subscribe to current page changes
    const pageSub = this.pdfService.currentPage$.subscribe(page => {
      this.currentPage = page;
      // Trigger change detection manually
      this.cdr.detectChanges();
    });
    this.subscriptions.push(pageSub);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  navigateToPage(item: PdfOutlineItem): void {
    this.pdfService.navigateToPage(item.page);
  }

  toggleExpanded(item: PdfOutlineItem): void {
    item.expanded = !item.expanded;
  }

  // Check if this item is active (current page is within this section)
  isItemActive(item: PdfOutlineItem): boolean {
    if (!this.currentPage) return false;

    // Find the next item at the same level to determine the range
    const nextItem = this.findNextItem(item);
    const endPage = nextItem ? nextItem.page - 1 : Infinity;

    // Check if current page is in this item's range
    const inRange = this.currentPage >= item.page && this.currentPage <= endPage;

    if (!inRange) return false;

    // If this item has children, check if any child is active
    // If a child is active, this parent should NOT be active (only the deepest item should be active)
    if (item.items && item.items.length > 0) {
      for (const childItem of item.items) {
        if (this.isItemActive(childItem)) {
          return false; // Child is active, so parent should not be
        }
      }
    }

    return true;
  }

  // Find the next outline item to determine the section range
  private findNextItem(targetItem: PdfOutlineItem): PdfOutlineItem | null {
    let found = false;
    let nextItem: PdfOutlineItem | null = null;

    const findNext = (items: PdfOutlineItem[]): boolean => {
      for (let i = 0; i < items.length; i++) {
        const item = items[i];

        if (found) {
          nextItem = item;
          return true;
        }

        if (item === targetItem) {
          found = true;
          // Check if there's a next sibling
          if (i + 1 < items.length) {
            nextItem = items[i + 1];
            return true;
          }
          continue;
        }

        if (item.items && item.items.length > 0) {
          if (findNext(item.items)) {
            return true;
          }
        }
      }
      return false;
    };

    findNext(this.outlineItems);
    return nextItem;
  }
}
