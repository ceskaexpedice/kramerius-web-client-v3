import { Injectable } from '@angular/core';
import {EnvironmentService} from './environment.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {PdfOutlineItem} from '../components/pdf-content-tree/pdf-content-tree.component';
import {PdfPageThumbnail} from '../components/pdf-pages-grid/pdf-pages-grid.component';

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  _uuid: string | null = null;
  private _pdfDocument: any = null;

  // Observables for PDF state
  private outlineSubject = new BehaviorSubject<PdfOutlineItem[]>([]);
  public outline$: Observable<PdfOutlineItem[]> = this.outlineSubject.asObservable();

  private pagesSubject = new BehaviorSubject<PdfPageThumbnail[]>([]);
  public pages$: Observable<PdfPageThumbnail[]> = this.pagesSubject.asObservable();

  private currentPageSubject = new BehaviorSubject<number>(1);
  public currentPage$: Observable<number> = this.currentPageSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(0);
  public totalPages$: Observable<number> = this.totalPagesSubject.asObservable();

  // Subject for triggering page navigation
  private navigateToPageSubject = new BehaviorSubject<number | null>(null);
  public navigateToPage$: Observable<number | null> = this.navigateToPageSubject.asObservable();

  constructor(
    private env: EnvironmentService
  ) {
  }

  set uuid(uuid: string | null) {
    this._uuid = uuid;
    // Reset state when UUID changes
    if (uuid) {
      this.resetState();
    }
  }

  get uuid(): string | null {
    return this._uuid;
  }

  private get API_URL(): string {
    const url = this.env.getApiUrl('items');
    if (!url) {
      console.warn('AuthService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  get url(): string | null {
    return this.uuid ? `${this.API_URL}/${this.uuid}/image` : null;
  }

  // Set PDF outline/table of contents
  setOutline(outline: PdfOutlineItem[]): void {
    this.outlineSubject.next(outline);
  }

  // Set PDF pages with thumbnails
  setPages(pages: PdfPageThumbnail[]): void {
    this.pagesSubject.next(pages);
  }

  // Set current page number
  setCurrentPage(page: number): void {
    this.currentPageSubject.next(page);
  }

  // Set total pages
  setTotalPages(total: number): void {
    this.totalPagesSubject.next(total);
  }

  // Navigate to specific page
  navigateToPage(page: number): void {
    this.navigateToPageSubject.next(page);
    this.setCurrentPage(page);
  }

  // Get page thumbnail URL
  getPageThumbnailUrl(pageNumber: number): string {
    if (!this.uuid) return '';
    return `${this.API_URL}/${this.uuid}/thumb/${pageNumber}`;
  }

  // Set the PDF document reference for page resolution
  setPdfDocument(pdfDocument: any): void {
    this._pdfDocument = pdfDocument;
  }

  // Process outline loaded event from ngx-extended-pdf-viewer
  async processOutlineLoaded(outline: any): Promise<void> {
    console.log('processOutlineLoaded - Event:', outline);

    if (!outline) {
      console.warn('processOutlineLoaded - No outline event received');
      return;
    }

    // Store the PDF document reference if available
    if (outline.source && outline.source._pdfDocument) {
      this._pdfDocument = outline.source._pdfDocument;
    }

    // The outline event has a 'source' property which is the PDFOutlineViewer
    // We need to get the outline data from the viewer
    if (outline.source && outline.source.outline) {
      console.log('processOutlineLoaded - Found outline in source.outline');
      const outlineData = outline.source.outline;
      console.log('processOutlineLoaded - Outline data:', outlineData);
      const outlineItems = await this.parseOutlineItems(outlineData);
      console.log('processOutlineLoaded - Parsed items:', outlineItems);
      this.setOutline(outlineItems);
    }
    // Fallback: check for other possible locations
    else if (outline.source && outline.source._outline) {
      console.log('processOutlineLoaded - Found outline in source._outline');
      const outlineData = outline.source._outline;
      const outlineItems = await this.parseOutlineItems(outlineData);
      this.setOutline(outlineItems);
    }
    // Check the PDFDocument for outline
    else if (outline.source && outline.source._pdfDocument) {
      console.log('processOutlineLoaded - Getting outline from PDFDocument');
      const outlineData = await outline.source._pdfDocument.getOutline();
      console.log('processOutlineLoaded - Outline from document:', outlineData);
      if (outlineData) {
        const outlineItems = await this.parseOutlineItems(outlineData);
        console.log('processOutlineLoaded - Parsed items:', outlineItems);
        this.setOutline(outlineItems);
      }
    } else {
      console.warn('processOutlineLoaded - Could not find outline data in event');
    }
  }

  // Parse outline items recursively
  private async parseOutlineItems(items: any): Promise<PdfOutlineItem[]> {
    // If items is not an array, try to extract array from it
    if (!Array.isArray(items)) {
      console.log('parseOutlineItems - Not an array, type:', typeof items);

      // Check if it's an object with properties that might contain the array
      if (items && typeof items === 'object') {
        // Try common property names
        const possibleArrays = ['outline', 'items', 'children', 'bookmarks'];
        for (const prop of possibleArrays) {
          if (items[prop] && Array.isArray(items[prop])) {
            console.log(`parseOutlineItems - Found array in property: ${prop}`);
            items = items[prop];
            break;
          }
        }
      }

      // If still not an array, return empty
      if (!Array.isArray(items)) {
        console.warn('parseOutlineItems - Could not convert to array:', items);
        return [];
      }
    }

    console.log('parseOutlineItems - Processing array with', items.length, 'items');

    const parsedItems = await Promise.all(items.map(async (item, index) => {
      console.log(`parseOutlineItems - Item ${index}:`, item);
      const page = await this.extractPageNumber(item);
      const parsed = {
        title: item.title || item.name || item.label || 'Untitled',
        page: page,
        items: item.items || item.children ? await this.parseOutlineItems(item.items || item.children) : undefined,
        expanded: false
      };
      console.log(`parseOutlineItems - Parsed ${index}:`, parsed);
      return parsed;
    }));

    return parsedItems;
  }

  // Extract page number from outline item
  private async extractPageNumber(item: any): Promise<number> {
    console.log('extractPageNumber - item:', item);

    // Check if there's a direct page property first
    if (item.page !== undefined && item.page !== null) {
      if (typeof item.page === 'number') {
        console.log('extractPageNumber - Using item.page:', item.page);
        return item.page;
      }
    }

    // Check for pageNumber property
    if (item.pageNumber !== undefined && item.pageNumber !== null) {
      if (typeof item.pageNumber === 'number') {
        console.log('extractPageNumber - Using item.pageNumber:', item.pageNumber);
        return item.pageNumber;
      }
    }

    // Handle destination formats from PDF.js
    if (item.dest) {
      console.log('extractPageNumber - dest:', item.dest, 'type:', typeof item.dest);

      // If dest is a string, it's a named destination - need to resolve it
      if (typeof item.dest === 'string') {
        console.log('extractPageNumber - Named destination (string)');
        if (this._pdfDocument) {
          try {
            const dest = await this._pdfDocument.getDestination(item.dest);
            if (dest && Array.isArray(dest) && dest.length > 0) {
              const pageRef = dest[0];
              const pageIndex = await this._pdfDocument.getPageIndex(pageRef);
              console.log('extractPageNumber - Resolved named destination to page:', pageIndex + 1);
              return pageIndex + 1; // Convert 0-based to 1-based
            }
          } catch (error) {
            console.warn('extractPageNumber - Error resolving named destination:', error);
          }
        }
        return 1;
      }

      // If dest is an array, first element contains page reference
      if (Array.isArray(item.dest) && item.dest.length > 0) {
        const pageRef = item.dest[0];
        console.log('extractPageNumber - dest[0]:', pageRef, 'type:', typeof pageRef);

        // Direct number (page index, 0-based)
        if (typeof pageRef === 'number') {
          console.log('extractPageNumber - Using dest[0] as page index:', pageRef + 1);
          return pageRef + 1; // Convert 0-based to 1-based
        }

        // Object with num property (page reference object)
        if (pageRef && typeof pageRef === 'object' && 'num' in pageRef) {
          console.log('extractPageNumber - Page reference object:', pageRef);
          // This is a PDF object reference, need to resolve it to actual page number
          if (this._pdfDocument) {
            try {
              const pageIndex = await this._pdfDocument.getPageIndex(pageRef);
              console.log('extractPageNumber - Resolved page reference to index:', pageIndex, 'page:', pageIndex + 1);
              return pageIndex + 1; // Convert 0-based to 1-based
            } catch (error) {
              console.warn('extractPageNumber - Error resolving page reference:', error);
            }
          } else {
            console.warn('extractPageNumber - No PDF document available to resolve reference');
          }
        }
      }
    }

    console.log('extractPageNumber - No valid page found, defaulting to 1');
    return 1; // Default to page 1
  }

  // Reset all state
  private resetState(): void {
    this.outlineSubject.next([]);
    this.pagesSubject.next([]);
    this.currentPageSubject.next(1);
    this.totalPagesSubject.next(0);
    this.navigateToPageSubject.next(null);
  }

}
