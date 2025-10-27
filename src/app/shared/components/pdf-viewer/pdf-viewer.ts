import {Component, inject, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {NgxExtendedPdfViewerComponent, NgxExtendedPdfViewerModule, OutlineLoadedEvent} from 'ngx-extended-pdf-viewer';
import {Metadata} from '../../models/metadata.model';
import {PdfService} from '../../services/pdf.service';
import {Subscription} from 'rxjs';
import {AsyncPipe} from '@angular/common';
import {ActivatedRoute, Router} from '@angular/router';
import {ViewerControls} from '../viewer-controls/viewer-controls';

@Component({
  selector: 'app-pdf-viewer',
  imports: [
    NgxExtendedPdfViewerModule,
    AsyncPipe,
    ViewerControls,
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

    // Store the actual PDF document reference from the event
    // The event can contain the document in different ways depending on the library version
    const pdfDocument = event.source?._pdfDocument || event.pdfDocument || event;

    // Store the PDF document reference in the service for page resolution
    this.pdfService.setPdfDocument(pdfDocument);

    // Set total pages
    const pagesCount = event.pagesCount || pdfDocument?.numPages || 0;
    if (pagesCount) {
      this.pdfService.setTotalPages(pagesCount);
    }
  }

  onPagesLoaded(event: any): void {
    // Pages are loaded - pass the component reference and mark as ready
    console.log('Pages loaded, passing viewer component to service...');

    // Pass the ViewChild component reference to the service
    if (this.pdfViewer) {
      this.pdfService.setPdfViewerComponent(this.pdfViewer);
      console.log('PDF viewer component set');
    }

    // Wait 1 second for the component service to be fully initialized
    setTimeout(() => {
      this.pdfService.setPdfViewerReady();
      console.log('PDF viewer marked as ready for search');
    }, 1000);
  }

  onTextLayerRendered(event: any): void {
  }

  onPageChange(page: number): void {
    this.pdfService.setCurrentPage(page);
  }

  async onTextViewToggle(): Promise<void> {
    await this.pdfService.extractCurrentPageText();
  }

  onWheel(event: WheelEvent): void {
    // Only enable wheel zoom when in single page view mode
    if (this.pdfService.pdfProperties.pageViewMode !== 'single') {
      return;
    }

    // Prevent default scroll behavior
    event.preventDefault();
    event.stopPropagation();

    // Determine zoom direction based on wheel delta
    // deltaY > 0 means scrolling down (zoom out)
    // deltaY < 0 means scrolling up (zoom in)
    if (event.deltaY < 0) {
      this.pdfService.zoomIn();
    } else if (event.deltaY > 0) {
      this.pdfService.zoomOut();
    }
  }

}
