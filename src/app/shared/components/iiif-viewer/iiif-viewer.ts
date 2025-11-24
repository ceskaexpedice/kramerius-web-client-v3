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
  AfterViewInit,
  NgZone
} from '@angular/core';
import { Metadata } from '../../models/metadata.model';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { Subscription } from 'rxjs';
import { FullscreenComponent } from '../fullscreen/fullscreen.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import OpenSeadragon from 'openseadragon';
import { SelectionControls } from '../selection-controls/selection-controls';
import { CommonModule } from '@angular/common';
import { RecordHandlerService } from '../../services/record-handler.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService } from '../../services/export.service';

@Component({
  selector: 'app-iiif-viewer',
  imports: [
    FullscreenComponent,
    SelectionControls,
    CommonModule
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
  private recordHandlerService = inject(RecordHandlerService);
  private exportService = inject(ExportService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private subscriptions: Subscription[] = [];

  private viewer: OpenSeadragon.Viewer | null = null;
  private isUpdating = false;
  private failedPids = new Set<string>();

  public selectionRect: { top: number, left: number } | null = null;
  public showSelectionControls = false;


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

    this.subscriptions.push(
      this.iiifViewerService.selectedArea$.subscribe(rect => {
        this.ngZone.run(() => {
          if (rect) {
            this.showSelectionControls = true;
            this.updateSelectionControlsPosition(rect);
          } else {
            this.showSelectionControls = false;
          }
        });
      })
    );

    // Check for selection in URL
    this.subscriptions.push(
      this.iiifViewerService.imageLoaded$.subscribe(() => {
        const bb = this.route.snapshot.queryParamMap.get('bb');
        if (bb) {
          const parts = bb.split(',');
          if (parts.length === 4) {
            const x = parseFloat(parts[0]);
            const y = parseFloat(parts[1]);
            const w = parseFloat(parts[2]);
            const h = parseFloat(parts[3]);

            if (!isNaN(x) && !isNaN(y) && !isNaN(w) && !isNaN(h)) {
              const rect = new OpenSeadragon.Rect(x, y, w, h);
              this.iiifViewerService.setSelection(rect);

              this.router.navigate([], {
                relativeTo: this.route,
                queryParams: { bb: null },
                queryParamsHandling: 'merge',
                replaceUrl: true
              });
            }
          }
        }
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

    this.viewer.addHandler('update-viewport', () => {
      if (this.showSelectionControls) {

      }
    });

    this.viewer.addHandler('animation', () => {
      this.ngZone.run(() => {
        this.updateControlsPosition();
      });
    });
    this.viewer.addHandler('update-viewport', () => {
      this.ngZone.run(() => {
        this.updateControlsPosition();
      });
    });


    this.viewer.addHandler('open-failed', (event: any) => {
      const currentPid = this.imagePid || this.metadata?.uuid;
      if (!currentPid) {
        console.error('No PID available for fallback');
        return;
      }

      if (this.failedPids.has(currentPid)) {
        console.error(`Fallback already failed for PID: ${currentPid}. Stopping to prevent infinite loop.`);
        return;
      }

      this.failedPids.add(currentPid);

      const directImageUrl = this.iiifViewerService.getDirectImageUrl(currentPid);
      console.log(`Attempting fallback image: ${directImageUrl}`);

      if (this.viewer) {
        this.viewer.open({
          type: 'image',
          url: directImageUrl
        });
      }

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

  private currentImageRect: OpenSeadragon.Rect | null = null;

  private updateSelectionControlsPosition(imageRect: OpenSeadragon.Rect) {
    this.currentImageRect = imageRect;
    this.updateControlsPosition();
  }

  private updateControlsPosition() {
    if (!this.viewer || !this.currentImageRect || !this.showSelectionControls) return;

    const viewportRect = this.viewer.viewport.imageToViewportRectangle(this.currentImageRect);
    const elementRect = this.viewer.viewport.viewportToViewerElementRectangle(viewportRect);

    this.selectionRect = {
      top: elementRect.y,
      left: elementRect.x + elementRect.width + 10
    };
  }

  onText() {
    console.log('Text action triggered');
  }

  onExport() {
    if (this.currentImageRect && this.imagePid) {
      const rect = {
        x: this.currentImageRect.x,
        y: this.currentImageRect.y,
        width: this.currentImageRect.width,
        height: this.currentImageRect.height
      };
      this.exportService.exportJpegCrop(this.imagePid, rect);
    } else {
      console.warn('No selection or image PID available for export');
    }
  }

  onShare() {
    if (this.currentImageRect && this.metadata) {
      const x = Math.round(this.currentImageRect.x);
      const y = Math.round(this.currentImageRect.y);
      const w = Math.round(this.currentImageRect.width);
      const h = Math.round(this.currentImageRect.height);
      const bb = `${x},${y},${w},${h}`;

      this.recordHandlerService.openShareDialog(this.metadata, { bb });
    }
  }
}
