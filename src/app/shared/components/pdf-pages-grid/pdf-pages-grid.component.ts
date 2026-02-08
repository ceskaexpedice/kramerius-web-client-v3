import {Component, inject, OnInit} from '@angular/core';
import {PdfService} from '../../services/pdf.service';
import {NgFor, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {ThumbnailImageComponent} from '../thumbnail-image/thumbnail-image.component';

export interface PdfPageThumbnail {
  pageNumber: number;
  thumbnailUrl: string;
}

@Component({
  selector: 'app-pdf-pages-grid',
  imports: [NgFor, NgIf, TranslatePipe, ThumbnailImageComponent],
  templateUrl: './pdf-pages-grid.component.html',
  styleUrl: './pdf-pages-grid.component.scss'
})
export class PdfPagesGridComponent implements OnInit {
  public pdfService = inject(PdfService);
  public pages: PdfPageThumbnail[] = [];
  public currentPage = 1;
  public loadedThumbnails: Map<number, string> = new Map();

  ngOnInit(): void {
    this.pdfService.pages$.subscribe(pages => {
      this.pages = pages || [];
      // Load thumbnails for visible pages
      this.loadVisibleThumbnails();
    });

    this.pdfService.currentPage$.subscribe(page => {
      this.currentPage = page;
    });
  }

  async loadVisibleThumbnails(): Promise<void> {
    // Load thumbnails for all pages (they will be cached in the service)
    for (const page of this.pages) {
      if (!this.loadedThumbnails.has(page.pageNumber)) {
        const thumbnail = await this.pdfService.getPageThumbnail(page.pageNumber);
        this.loadedThumbnails.set(page.pageNumber, thumbnail);
      }
    }
  }

  getThumbnailUrl(pageNumber: number): string {
    return this.loadedThumbnails.get(pageNumber) || '';
  }

  navigateToPage(pageNumber: number): void {
    this.pdfService.navigateToPage(pageNumber);
  }
}
