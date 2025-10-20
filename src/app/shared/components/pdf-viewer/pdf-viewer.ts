import {Component, inject, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgxExtendedPdfViewerComponent, NgxExtendedPdfViewerModule, OutlineLoadedEvent} from 'ngx-extended-pdf-viewer';
import {Metadata} from '../../models/metadata.model';
import {PdfService} from '../../services/pdf.service';
import {PdfOutlineItem} from '../pdf-content-tree/pdf-content-tree.component';
import {PdfPageThumbnail} from '../pdf-pages-grid/pdf-pages-grid.component';
import {Subscription} from 'rxjs';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-pdf-viewer',
  imports: [
    NgxExtendedPdfViewerModule,
    AsyncPipe,
  ],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.scss'
})
export class PdfViewer implements OnInit, OnDestroy {

  @Input() metadata: Metadata | null = null;
  @ViewChild(NgxExtendedPdfViewerComponent) pdfViewer?: NgxExtendedPdfViewerComponent;

  public pdfService = inject(PdfService);
  private subscriptions: Subscription[] = [];

  constructor() {
  }

  ngOnInit(): void {
    this.pdfService.uuid = this.metadata?.uuid || null;
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onOutlineLoaded(outline: OutlineLoadedEvent) {
    this.pdfService.processOutlineLoaded(outline);
  }

  onPdfLoaded(event: any): void {
    console.log('onPdfLoaded - event:', event);

    // The event structure varies, try to find the PDF document
    let pdfDocument = {
      pagesCount: event.pagesCount || 0,
    };

    // Store the PDF document reference in the service for page resolution
    this.pdfService.setPdfDocument(pdfDocument);

    // Set total pages
    if (pdfDocument.pagesCount) {
      this.pdfService.setTotalPages(pdfDocument.pagesCount);

      // Generate page thumbnails
      this.generatePageThumbnails(pdfDocument.pagesCount);
    }

    // Note: outline is now loaded via onOutlineLoaded event handler
  }

  onPageChange(page: number): void {
    this.pdfService.setCurrentPage(page);
  }

  private parseOutline(outline: any[]): PdfOutlineItem[] {
    return outline.map(item => ({
      title: item.title,
      page: item.dest ? this.getPageNumberFromDest(item.dest) : 1,
      items: item.items ? this.parseOutline(item.items) : undefined,
      expanded: false
    }));
  }

  private getPageNumberFromDest(dest: any): number {
    // PDF.js destination format varies, this is a simplified version
    if (Array.isArray(dest) && dest.length > 0) {
      return dest[0].num || 1;
    }
    return 1;
  }

  private generatePageThumbnails(totalPages: number): void {
    const pages: PdfPageThumbnail[] = [];
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        pageNumber: i,
        thumbnailUrl: this.pdfService.getPageThumbnailUrl(i)
      });
    }
    this.pdfService.setPages(pages);
  }

}
