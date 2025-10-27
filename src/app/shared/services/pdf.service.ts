import { Injectable, NgZone } from '@angular/core';
import {EnvironmentService} from './environment.service';
import {BehaviorSubject, Observable} from 'rxjs';
import {PdfOutlineItem} from '../components/pdf-content-tree/pdf-content-tree.component';
import {PdfPageThumbnail} from '../components/pdf-pages-grid/pdf-pages-grid.component';
import {FindState, NgxExtendedPdfViewerService, PageViewModeType, ZoomType} from 'ngx-extended-pdf-viewer';

export interface PdfProperties {
  zoom: ZoomType;
  rotation: 0 | 90 | 180 | 270;
  fullscreen: boolean;
  pageViewMode: PageViewModeType;
  bookMode?: boolean;
  textLayerMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  pdfFindProperties = {
    highlightAll: true,
    matchCase: false,
    wholeWord: false,
    matchDiacritics: false,
    dontScrollIntoView: false,
    multiple: false,
    matchRegExp: false
  }

  findState: FindState | undefined = undefined;

  pdfFindResult = {
    currentMatchNumber: undefined as number | undefined,
    totalMatches: undefined as number | undefined,
    findState: undefined as 'found' | 'notfound' | 'pending' | undefined,
    pagesWithResult: [] as number[]
  }

  pdfProperties: PdfProperties = {
    zoom: 'page-fit',
    rotation: 0,
    fullscreen: false,
    bookMode: false,
    pageViewMode: 'single',
    textLayerMode: true
  }

  _uuid: string | null = null;
  private _pdfDocument: any = null;
  private thumbnailCache: Map<number, string> = new Map();
  private generatingThumbnails: Set<number> = new Set();
  private pdfViewerReady: boolean = false;

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

  // Subject for search query
  private searchQuerySubject = new BehaviorSubject<string>('');
  public searchQuery$: Observable<string> = this.searchQuerySubject.asObservable();

  constructor(
    private env: EnvironmentService,
    private ngZone: NgZone,
    private ngxExtendedPdfViewerService: NgxExtendedPdfViewerService
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

  // Get current page value
  getCurrentPage(): number {
    return this.currentPageSubject.value;
  }

  // Get total pages value
  getTotalPages(): number {
    return this.totalPagesSubject.value;
  }

  // Set search query
  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);

    if (this.pdfViewerReady) {
      this.find();
    }
  }

  // Mark PDF viewer as ready
  setPdfViewerReady(): void {
    this.pdfViewerReady = true;
  }

  // Get current search query
  getSearchQuery(): string {
    return this.searchQuerySubject.value;
  }

  public updateFindState(result: FindState) {
    this.findState = result;
  }

  private find(): Array<Promise<number>> | undefined {
    this.pdfFindResult.pagesWithResult = [];

    let searchtext = this.getSearchQuery();

    // If search text is empty, clear results
    if (!searchtext || searchtext.trim() === '') {
      this.pdfFindResult.findState = undefined;
      this.pdfFindResult.currentMatchNumber = undefined;
      this.pdfFindResult.totalMatches = undefined;

      // Clear search highlights
      try {
        this.ngxExtendedPdfViewerService.find('', {
          highlightAll: false,
          matchCase: false,
          wholeWords: false,
          matchDiacritics: false,
          dontScrollIntoView: false,
          useSecondaryFindcontroller: false,
          findMultiple: false,
          regexp: false
        });
      } catch (e) {
        // Ignore errors when clearing
      }

      return undefined;
    }

    // Check if the service is actually ready
    if (!this.ngxExtendedPdfViewerService || typeof this.ngxExtendedPdfViewerService.find !== 'function') {
      return undefined;
    }

    const numberOfResultsPromises = this.ngxExtendedPdfViewerService.find(searchtext, {
      highlightAll: this.pdfFindProperties.highlightAll,
      matchCase: this.pdfFindProperties.matchCase,
      wholeWords: this.pdfFindProperties.wholeWord,
      matchDiacritics: this.pdfFindProperties.matchDiacritics,
      dontScrollIntoView: this.pdfFindProperties.dontScrollIntoView,
      useSecondaryFindcontroller: false,
      findMultiple: this.pdfFindProperties.multiple,
      regexp: this.pdfFindProperties.matchRegExp
    });

    numberOfResultsPromises?.forEach(async (numberOfResultsPromise, pageIndex) => {
      const numberOfResultsPerPage = await numberOfResultsPromise;
      if (numberOfResultsPerPage > 0) {
        this.pdfFindResult.pagesWithResult.push(pageIndex);
      }
    });

    return numberOfResultsPromises;
  }

  public findNext(): void {
    this.ngxExtendedPdfViewerService.findNext();
  }

  public findPrevious(): void {
    this.ngxExtendedPdfViewerService.findPrevious();
  }

  // Get page thumbnail - returns cached base64 image or generates it
  async getPageThumbnail(pageNumber: number): Promise<string> {
    // Check cache first
    if (this.thumbnailCache.has(pageNumber)) {
      return this.thumbnailCache.get(pageNumber)!;
    }

    // Check if already generating
    if (this.generatingThumbnails.has(pageNumber)) {
      // Wait for generation to complete
      return new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.thumbnailCache.has(pageNumber)) {
            clearInterval(checkInterval);
            resolve(this.thumbnailCache.get(pageNumber)!);
          }
        }, 100);
      });
    }

    // Generate thumbnail
    if (!this._pdfDocument) {
      return ''; // Return empty if no document loaded
    }

    this.generatingThumbnails.add(pageNumber);

    try {
      const page = await this._pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 0.3 }); // Smaller thumbnails

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not get canvas context');
      }

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      await page.render(renderContext).promise;

      const imgData = canvas.toDataURL('image/jpeg', 0.8); // Use JPEG with 80% quality for smaller size

      // Cache the thumbnail
      this.thumbnailCache.set(pageNumber, imgData);
      this.generatingThumbnails.delete(pageNumber);

      return imgData;
    } catch (error) {
      console.error(`Error generating thumbnail for page ${pageNumber}:`, error);
      this.generatingThumbnails.delete(pageNumber);
      return '';
    }
  }

  // Get page thumbnail URL (for backward compatibility, but returns empty now)
  getPageThumbnailUrl(pageNumber: number): string {
    // This method is deprecated - use getPageThumbnail() instead
    return '';
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

    // Run inside NgZone to ensure change detection is triggered
    this.ngZone.run(async () => {
      // The outline event has a 'source' property which is the PDFOutlineViewer
      // We need to get the outline data from the viewer
      if (outline.source && outline.source.outline) {
        const outlineData = outline.source.outline;
        const outlineItems = await this.parseOutlineItems(outlineData);
        this.setOutline(outlineItems);
      }
      // Fallback: check for other possible locations
      else if (outline.source && outline.source._outline) {
        const outlineData = outline.source._outline;
        const outlineItems = await this.parseOutlineItems(outlineData);
        this.setOutline(outlineItems);
      }
      // Check the PDFDocument for outline
      else if (outline.source && outline.source._pdfDocument) {
        const outlineData = await outline.source._pdfDocument.getOutline();
        if (outlineData) {
          const outlineItems = await this.parseOutlineItems(outlineData);
          this.setOutline(outlineItems);
        }
      } else {
        console.warn('processOutlineLoaded - Could not find outline data in event');
      }
    });
  }

  // Parse outline items recursively
  private async parseOutlineItems(items: any): Promise<PdfOutlineItem[]> {
    // If items is not an array, try to extract array from it
    if (!Array.isArray(items)) {
      // Check if it's an object with properties that might contain the array
      if (items && typeof items === 'object') {
        // Try common property names
        const possibleArrays = ['outline', 'items', 'children', 'bookmarks'];
        for (const prop of possibleArrays) {
          if (items[prop] && Array.isArray(items[prop])) {
            items = items[prop];
            break;
          }
        }
      }

      // If still not an array, return empty
      if (!Array.isArray(items)) {
        return [];
      }
    }

    const parsedItems = await Promise.all(items.map(async (item, index) => {
      const page = await this.extractPageNumber(item);
      const parsed = {
        title: item.title || item.name || item.label || 'Untitled',
        page: page,
        items: item.items || item.children ? await this.parseOutlineItems(item.items || item.children) : undefined,
        expanded: true
      };
      return parsed;
    }));

    return parsedItems;
  }

  // Extract page number from outline item
  private async extractPageNumber(item: any): Promise<number> {
    // Check if there's a direct page property first
    if (item.page !== undefined && item.page !== null) {
      if (typeof item.page === 'number') {
        return item.page;
      }
    }

    // Check for pageNumber property
    if (item.pageNumber !== undefined && item.pageNumber !== null) {
      if (typeof item.pageNumber === 'number') {
        return item.pageNumber;
      }
    }

    // Handle destination formats from PDF.js
    if (item.dest) {

      // If dest is a string, it's a named destination - need to resolve it
      if (typeof item.dest === 'string') {
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

        // Direct number (page index, 0-based)
        if (typeof pageRef === 'number') {
          return pageRef + 1; // Convert 0-based to 1-based
        }

        // Object with num property (page reference object)
        if (pageRef && typeof pageRef === 'object' && 'num' in pageRef) {
          // This is a PDF object reference, need to resolve it to actual page number
          if (this._pdfDocument) {
            try {
              const pageIndex = await this._pdfDocument.getPageIndex(pageRef);
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

    return 1; // Default to page 1
  }

  // Reset all state
  private resetState(): void {
    this.outlineSubject.next([]);
    this.pagesSubject.next([]);
    this.currentPageSubject.next(1);
    this.totalPagesSubject.next(0);
    this.navigateToPageSubject.next(null);
    this.searchQuerySubject.next('');
    this.thumbnailCache.clear();
    this.generatingThumbnails.clear();
    this.pdfViewerReady = false;
  }

  private getCurrentScaleFactor(): number {
    // Try to get the scale factor from the viewer element
    const viewerElement = document.getElementById('viewer');
    if (viewerElement) {
      const scaleFactor = getComputedStyle(viewerElement).getPropertyValue('--scale-factor');
      if (scaleFactor) {
        const scale = parseFloat(scaleFactor);
        if (!isNaN(scale) && scale > 0) {
          return scale;
        }
      }
    }
    // Default to 1.0 if we can't get the scale factor
    return 1.0;
  }

  zoomIn(): void {
    // check if zoom is a number, if not calculate it from current scale
    if (typeof this.pdfProperties.zoom !== 'number') {
      const currentScale = this.getCurrentScaleFactor();
      this.pdfProperties.zoom = Math.round(currentScale * 100);
    }
    this.pdfProperties.zoom += 5;
  }

  zoomOut(): void {
    if (typeof this.pdfProperties.zoom !== 'number') {
      const currentScale = this.getCurrentScaleFactor();
      this.pdfProperties.zoom = Math.round(currentScale * 100);
    }
    this.pdfProperties.zoom -= 5;
  }

  setRotation(rotation: 0 | 90 | 180 | 270): void {
    this.pdfProperties.rotation = rotation;
  }

  toggleRotation(): void {
    if (this.pdfProperties.rotation === 0) {
      this.pdfProperties.rotation = 90;
    } else if (this.pdfProperties.rotation === 90) {
      this.pdfProperties.rotation = 180;
    } else if (this.pdfProperties.rotation === 180) {
      this.pdfProperties.rotation = 270;
    } else {
      this.pdfProperties.rotation = 0;
    }
  }

  toggleFullscreen(): void {
    this.pdfProperties.fullscreen = !this.pdfProperties.fullscreen;
  }

  togglePageViewMode(): void {
    const current = this.pdfProperties.pageViewMode;
    const next = current === 'multiple' ? 'single' : 'multiple';

    setTimeout(() => {
      this.pdfProperties = {
        ...this.pdfProperties,
        pageViewMode: next
      };
    }, 0);

    console.log('Switched to view mode:', next);
  }

  bookModeToggle() {
    if (this.pdfProperties.pageViewMode === 'book') {
      this.pdfProperties.pageViewMode = 'single';
    } else {
      this.pdfProperties.pageViewMode = 'book';
    }
    this.pdfProperties.bookMode = this.pdfProperties.pageViewMode === 'book';
  }

  toggleTextLayerMode() {
    this.pdfProperties.textLayerMode = !this.pdfProperties.textLayerMode;
  }

  fitToScreen() {
    this.pdfProperties.zoom = 'page-fit';
  }

  async getPageAsText(pageNumber?: number): Promise<string | undefined> {
    const currentPage = pageNumber || this.getCurrentPage();

    try {
      const text = await this.ngxExtendedPdfViewerService.getPageAsText(currentPage);
      return text;
    } catch (error) {
      console.error(`Error extracting text from page ${currentPage}:`, error);
      return undefined;
    }
  }

  async extractCurrentPageText(): Promise<void> {
    const currentPage = this.getCurrentPage();
    console.log(`Extracting text from page ${currentPage}...`);

    const text = await this.getPageAsText(currentPage);

    if (text) {
      console.log(`Text from page ${currentPage}:`, text);
    } else {
      console.log(`No text found on page ${currentPage}`);
    }
  }

}
