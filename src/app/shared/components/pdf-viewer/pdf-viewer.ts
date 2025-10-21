import {Component, inject, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgxExtendedPdfViewerComponent, NgxExtendedPdfViewerModule, OutlineLoadedEvent} from 'ngx-extended-pdf-viewer';
import {Metadata} from '../../models/metadata.model';
import {PdfService} from '../../services/pdf.service';
import {PdfOutlineItem} from '../pdf-content-tree/pdf-content-tree.component';
import {PdfPageThumbnail} from '../pdf-pages-grid/pdf-pages-grid.component';
import {Subscription} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {PdfViewerControls} from './pdf-viewer-controls/pdf-viewer-controls';

@Component({
  selector: 'app-pdf-viewer',
  imports: [
    NgxExtendedPdfViewerModule,
    AsyncPipe,
    PdfViewerControls,
  ],
  templateUrl: './pdf-viewer.html',
  styleUrl: './pdf-viewer.scss'
})
export class PdfViewer implements OnInit, OnDestroy {

  @Input() metadata: Metadata | null = null;
  @ViewChild(NgxExtendedPdfViewerComponent) pdfViewer?: NgxExtendedPdfViewerComponent;

  public pdfService = inject(PdfService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private subscriptions: Subscription[] = [];
  private isInitialLoad = true;

  constructor() {
  }

  ngOnInit(): void {
    this.pdfService.uuid = this.metadata?.uuid || null;

    const pageChangeSub = this.pdfService.currentPage$.subscribe(page => {
      if (!this.isInitialLoad && page > 0) {
        this.updateUrlWithPage(page);
      }
    });
    this.subscriptions.push(pageChangeSub);

    // Subscribe to search query changes
    const searchSub = this.pdfService.searchQuery$.subscribe(query => {
      this.performSearch(query);
    });
    this.subscriptions.push(searchSub);

    this.checkAndNavigateToUrlPage();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  private checkAndNavigateToUrlPage(): void {
    const pageParam = this.route.snapshot.queryParams['page'];

    if (pageParam && this.metadata?.uuid) {
      // Format: uuid:xxxx_{pageNumber}
      const expectedPrefix = `${this.metadata.uuid}_`;
      if (pageParam.startsWith(expectedPrefix)) {
        const pageNumberStr = pageParam.substring(expectedPrefix.length);
        const pageNumber = parseInt(pageNumberStr, 10);

        if (!isNaN(pageNumber) && pageNumber > 0) {
          setTimeout(() => {
            this.pdfService.navigateToPage(pageNumber);
            this.isInitialLoad = false;
          }, 500); // Give PDF time to load
          return;
        }
      }
    }

    // No valid page param, mark as loaded
    this.isInitialLoad = false;
  }

  private updateUrlWithPage(pageNumber: number): void {
    if (!this.metadata?.uuid) return;

    // Format: uuid:xxxx_{pageNumber}
    const pageParam = `${this.metadata.uuid}_${pageNumber}`;

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: pageParam },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
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

  private performSearch(query: string): void {
    // Use the global PDFViewerApplication to perform search
    const PDFViewerApplication = (window as any).PDFViewerApplication;
    if (PDFViewerApplication && PDFViewerApplication.eventBus) {
      if (query && query.trim() !== '') {
        // Dispatch find event to search in PDF
        PDFViewerApplication.eventBus.dispatch('find', {
          source: PDFViewerApplication,
          type: '',
          query: query,
          caseSensitive: false,
          entireWord: false,
          highlightAll: true,
          findPrevious: false,
          matchDiacritics: false
        });
      } else {
        // Clear search if query is empty
        PDFViewerApplication.eventBus.dispatch('find', {
          source: PDFViewerApplication,
          type: '',
          query: '',
          caseSensitive: false,
          entireWord: false,
          highlightAll: false,
          findPrevious: false,
          matchDiacritics: false
        });
      }
    }
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
