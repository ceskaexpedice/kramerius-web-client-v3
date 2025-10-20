import {Component, inject, OnInit} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {NgFor, NgIf} from '@angular/common';

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
export class PdfContentTreeComponent implements OnInit {
  public pdfService = inject(PdfService);
  public outlineItems: PdfOutlineItem[] = [];
  public currentPage: number = 1;

  ngOnInit(): void {
    this.pdfService.outline$.subscribe(outline => {
      console.log('outlines::', outline)
      this.outlineItems = outline || [];
    });

    // Subscribe to current page changes
    this.pdfService.currentPage$.subscribe(page => {
      this.currentPage = page;
    });
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

    return this.currentPage >= item.page && this.currentPage <= endPage;
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
