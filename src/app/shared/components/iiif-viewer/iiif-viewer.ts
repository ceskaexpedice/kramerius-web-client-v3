import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit
} from '@angular/core';
import { Metadata } from '../../models/metadata.model';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { Subscription } from 'rxjs';
import { FullscreenComponent } from '../fullscreen/fullscreen.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import OpenSeadragon from 'openseadragon';

@Component({
  selector: 'app-iiif-viewer',
  imports: [
    FullscreenComponent,
  ],
  templateUrl: './iiif-viewer.html',
  styleUrl: './iiif-viewer.scss'
})
export class IIIFViewer implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  @Input() metadata: Metadata | null = null;
  @Input() imagePid: string | null = null;

  @ViewChild('viewerContainer', { static: false }) viewerContainer!: ElementRef;
  @ViewChild(FullscreenComponent, { static: false }) fullscreenComponent!: FullscreenComponent;

  public iiifViewerService = inject(IIIFViewerService);
  private detailViewService = inject(DetailViewService);
  private subscriptions: Subscription[] = [];

  private viewer: OpenSeadragon.Viewer | null = null;
  private isUpdating = false; // Guard against concurrent updates
  private failedPids = new Set<string>(); // Track failed PIDs to prevent retry loops

  private readonly TEST_FALLBACK = false;

  constructor() {
  }

  ngOnInit(): void {
    this.iiifViewerService.uuid = this.metadata?.uuid || null;

    // Subscribe to book mode changes
    this.subscriptions.push(
      this.iiifViewerService.bookMode$.subscribe(() => {
        this.updateViewerForBookMode();
      })
    );
  }

  ngAfterViewInit(): void {
    this.initializeViewer();

    // Set the fullscreen component reference in the service after view is initialized
    this.iiifViewerService.setFullscreenComponent(() => this.fullscreenComponent);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    if (this.viewer) {
      this.viewer.destroy();
    }
    // Disable test mode when component is destroyed
    this.iiifViewerService.setTestFallbackMode(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update viewer when imagePid changes
    if (changes['imagePid'] && !changes['imagePid'].firstChange) {
      this.updateViewerForBookMode();
    }
  }

  private initializeViewer(): void {
    const pid = this.imagePid || this.metadata?.uuid;
    if (!pid) {
      console.error('No PID or UUID provided for IIIF viewer');
      return;
    }

    // Enable test mode in service if TEST_FALLBACK is true
    this.iiifViewerService.setTestFallbackMode(this.TEST_FALLBACK);

    const infoUrl = this.iiifViewerService.getIIIFInfoUrl(pid);

    this.viewer = OpenSeadragon({
      element: this.viewerContainer.nativeElement,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
      tileSources: [infoUrl],
      showNavigationControl: false,
      showRotationControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      crossOriginPolicy: 'Anonymous', // Enable CORS for images from different domains
      ajaxWithCredentials: false, // Don't send credentials with CORS requests
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        flickEnabled: true,
        pinchToZoom: true,
        scrollToZoom: true
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: true,
        flickEnabled: true,
        pinchToZoom: true,
        scrollToZoom: false
      },
      minZoomLevel: 0.5,
      maxZoomLevel: 10,
      visibilityRatio: 1,
      constrainDuringPan: false
    });

    this.viewer.addHandler('open-failed', (event: any) => {
      // Get current PID from state, not stale closure
      const currentPid = this.imagePid || this.metadata?.uuid;
      if (!currentPid) {
        console.error('No PID available for fallback');
        return;
      }

      // Check if we've already tried and failed this PID to prevent loops
      if (this.failedPids.has(currentPid)) {
        console.error(`Fallback already failed for PID: ${currentPid}. Stopping to prevent infinite loop.`);
        return;
      }

      // Mark this PID as having failed
      this.failedPids.add(currentPid);

      // Try fallback to direct image
      const directImageUrl = this.iiifViewerService.getDirectImageUrl(currentPid);
      console.log(`Attempting fallback image: ${directImageUrl}`);

      if (this.viewer) {
        this.viewer.open({
          type: 'image',
          url: directImageUrl
        });
      }

      // Clear failed PID after a delay to allow retry on next page change
      setTimeout(() => {
        this.failedPids.delete(currentPid);
      }, 5000);
    });

    this.iiifViewerService.setViewer(this.viewer);
  }

  private updateViewerSource(): void {
    if (!this.viewer) return;

    const pid = this.imagePid || this.metadata?.uuid;
    if (!pid) return;

    const infoUrl = this.iiifViewerService.getIIIFInfoUrl(pid);
    this.viewer.open(infoUrl);
  }

  /**
   * Updates the viewer to handle book mode
   * If book mode is enabled, displays current and next page side by side
   * Otherwise, displays only the current page
   */
  private updateViewerForBookMode(): void {
    if (!this.viewer) return;

    // Prevent concurrent updates
    if (this.isUpdating) {
      console.log('Update already in progress, skipping');
      return;
    }

    const currentPid = this.imagePid || this.metadata?.uuid;
    if (!currentPid) return;

    this.isUpdating = true;

    try {
      // Get next page PID for book mode
      const nextPagePid = this.getNextPagePid();

      this.iiifViewerService.updateBookModeDisplay(currentPid, nextPagePid);
    } finally {
      setTimeout(() => {
        this.isUpdating = false;
      }, 100);
    }
  }

  /**
   * Gets the PID of the next page from DetailViewService
   * Returns null if there is no next page
   */
  private getNextPagePid(): string | null {
    const pages = this.detailViewService.pages;
    const currentPageIndex = this.detailViewService.currentPageIndex;

    if (currentPageIndex < pages.length - 1) {
      return pages[currentPageIndex + 1].pid;
    }

    return null;
  }
}
