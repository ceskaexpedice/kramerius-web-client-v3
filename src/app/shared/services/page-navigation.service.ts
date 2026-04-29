import { Injectable, inject } from '@angular/core';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { PdfService } from './pdf.service';
import { EpubService } from './epub.service';

/**
 * Centralized service for page navigation logic across all document types.
 * Eliminates code duplication in PDF, EPUB, and IIIF sidebars.
 */
@Injectable({
  providedIn: 'root'
})
export class PageNavigationService {
  private detailViewService = inject(DetailViewService);
  private pdfService = inject(PdfService);
  private epubService = inject(EpubService);

  /**
   * Navigate to the next page for any document type
   * @param docType - Document type: 'pdf', 'epub', or 'iiif'
   * @param useBookMode - For PDF, whether to skip 2 pages for book mode
   */
  public goToNext(docType: 'pdf' | 'epub' | 'iiif', useBookMode: boolean = false): void {
    switch (docType) {
      case 'pdf':
        const pdfCurrent = this.pdfService.getCurrentPage();
        const pdfTotal = this.pdfService.getTotalPages();
        const pdfIncrement = useBookMode ? 2 : 1;
        if (pdfCurrent < pdfTotal) {
          this.pdfService.navigateToPage(pdfCurrent + pdfIncrement);
        }
        break;
      case 'epub':
        this.epubService.goToNext();
        break;
      case 'iiif':
        this.detailViewService.goToNext();
        break;
    }
  }

  /**
   * Navigate to the previous page for any document type
   * @param docType - Document type: 'pdf', 'epub', or 'iiif'
   * @param useBookMode - For PDF, whether to skip 2 pages for book mode
   */
  public goToPrevious(docType: 'pdf' | 'epub' | 'iiif', useBookMode: boolean = false): void {
    switch (docType) {
      case 'pdf':
        const pdfCurrent = this.pdfService.getCurrentPage();
        const pdfDecrement = useBookMode ? 2 : 1;
        if (pdfCurrent > 1) {
          this.pdfService.navigateToPage(pdfCurrent - pdfDecrement);
        }
        break;
      case 'epub':
        this.epubService.goToPrevious();
        break;
      case 'iiif':
        this.detailViewService.goToPrevious();
        break;
    }
  }

  /**
   * Navigate to a specific page for any document type
   * @param page - Page number (1-indexed)
   * @param docType - Document type: 'pdf', 'epub', or 'iiif'
   */
  public goToPage(page: number, docType: 'pdf' | 'epub' | 'iiif'): void {
    switch (docType) {
      case 'pdf':
        this.pdfService.navigateToPage(page);
        break;
      case 'epub':
        this.epubService.goToPage(page);
        break;
      case 'iiif':
        this.detailViewService.goToPage(page);
        break;
    }
  }

  /**
   * Get current page for any document type
   */
  public getCurrentPage(docType: 'pdf' | 'epub' | 'iiif'): number {
    switch (docType) {
      case 'pdf':
        return this.pdfService.getCurrentPage();
      case 'epub':
        // EPUB service doesn't expose current page, would need to add
        return 0;
      case 'iiif':
        return this.detailViewService.currentPageIndex + 1;
      default:
        return 0;
    }
  }

  /**
   * Get total pages for any document type
   */
  public getTotalPages(docType: 'pdf' | 'epub' | 'iiif'): number {
    switch (docType) {
      case 'pdf':
        return this.pdfService.getTotalPages();
      case 'epub':
        // EPUB service doesn't expose total pages, would need to add
        return 0;
      case 'iiif':
        return this.detailViewService.totalPagesOnly;
      default:
        return 0;
    }
  }
}
