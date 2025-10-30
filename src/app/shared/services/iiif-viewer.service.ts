import { Injectable } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { BehaviorSubject, Observable } from 'rxjs';
import OpenSeadragon from 'openseadragon';

export interface IIIFViewerProperties {
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  fullscreen: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IIIFViewerService {

  viewerProperties: IIIFViewerProperties = {
    zoom: 1,
    rotation: 0,
    fullscreen: false
  };

  _uuid: string | null = null;

  private propertiesSubject = new BehaviorSubject<IIIFViewerProperties>(this.viewerProperties);
  public properties$: Observable<IIIFViewerProperties> = this.propertiesSubject.asObservable();

  private viewer: OpenSeadragon.Viewer | null = null;
  private isSelectionMode: boolean = false;
  private drawStartPoint: OpenSeadragon.Point | null = null;
  private selectionOverlay: HTMLElement | null = null;
  private mouseTracker: OpenSeadragon.MouseTracker | null = null;
  private rectangleCounter: number = 0;
  private dimOverlays: HTMLElement[] = [];
  private rectangles: Map<HTMLElement, OpenSeadragon.Rect> = new Map();

  constructor(
    private env: EnvironmentService
  ) {
  }

  set uuid(uuid: string | null) {
    this._uuid = uuid;
    if (uuid) {
      this.resetState();
    }
  }

  get uuid(): string | null {
    return this._uuid;
  }

  private get API_URL(): string {
    const url = this.env.getBaseApiUrl();
    if (!url) {
      console.warn('IIIFViewerService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  // Get IIIF info.json URL
  getIIIFInfoUrl(pid: string): string {
    return `${this.API_URL}/search/iiif/${pid}/info.json`;
  }

  // Set viewer instance
  setViewer(viewer: OpenSeadragon.Viewer): void {
    this.viewer = viewer;
    this.setupRectangleClickHandler();
  }

  // Setup global click handler for rectangles
  private setupRectangleClickHandler(): void {
    if (!this.viewer) return;

    this.viewer.addHandler('canvas-click', (event: any) => {
      const viewportPoint = this.viewer!.viewport.pointFromPixel(event.position);

      // Check if click is on any rectangle
      for (const [overlay, rect] of this.rectangles.entries()) {
        if (this.isPointInRect(viewportPoint, rect)) {
          this.onRectangleClick(rect, overlay);
          event.preventDefaultAction = true;
          break;
        }
      }
    });
  }

  // Check if point is inside rectangle
  private isPointInRect(point: OpenSeadragon.Point, rect: OpenSeadragon.Rect): boolean {
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  }

  // Get viewer instance
  getViewer(): OpenSeadragon.Viewer | null {
    return this.viewer;
  }

  // Reset all state
  private resetState(): void {
    this.viewerProperties = {
      zoom: 1,
      rotation: 0,
      fullscreen: false
    };
    this.propertiesSubject.next(this.viewerProperties);

    // Reset selection mode if active
    if (this.isSelectionMode) {
      this.disableSelectionMode();
      this.isSelectionMode = false;
    }

    // Clear all overlays and counters
    this.rectangleCounter = 0;
    this.dimOverlays = [];
    this.rectangles.clear();
  }

  // Zoom controls
  zoomIn(): void {
    if (this.viewer) {
      const currentZoom = this.viewer.viewport.getZoom();
      this.viewer.viewport.zoomTo(currentZoom * 1.2);
      this.viewerProperties.zoom = this.viewer.viewport.getZoom();
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  zoomOut(): void {
    if (this.viewer) {
      const currentZoom = this.viewer.viewport.getZoom();
      this.viewer.viewport.zoomTo(currentZoom / 1.2);
      this.viewerProperties.zoom = this.viewer.viewport.getZoom();
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  // Rotation controls
  setRotation(rotation: 0 | 90 | 180 | 270): void {
    if (this.viewer) {
      this.viewerProperties.rotation = rotation;
      this.viewer.viewport.setRotation(rotation);
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  toggleRotation(): void {
    let newRotation: 0 | 90 | 180 | 270;
    if (this.viewerProperties.rotation === 0) {
      newRotation = 90;
    } else if (this.viewerProperties.rotation === 90) {
      newRotation = 180;
    } else if (this.viewerProperties.rotation === 180) {
      newRotation = 270;
    } else {
      newRotation = 0;
    }
    this.setRotation(newRotation);
  }

  // Fullscreen control
  toggleFullscreen(): void {
    if (this.viewer) {
      this.viewerProperties.fullscreen = !this.viewerProperties.fullscreen;
      // if (this.viewerProperties.fullscreen) {
      //   this.viewer.setFullScreen(true);
      // } else {
      //   this.viewer.setFullScreen(false);
      // }
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  // Fit to screen control
  fitToScreen(): void {
    if (this.viewer) {
      this.viewer.viewport.goHome();
      this.viewerProperties.zoom = this.viewer.viewport.getZoom();
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  // Fit to width control
  fitToWidth(): void {
    if (!this.viewer) return;
    const viewport = this.viewer.viewport;
    const item = this.viewer.world.getItemAt(0);

    const containerWidth = viewport.getContainerSize().x;
    const imageWidth = item.getContentSize().x;

    const zoom = viewport.imageToViewportZoom(containerWidth / imageWidth);

    viewport.zoomTo(zoom);
    viewport.panTo(viewport.getHomeBounds().getCenter());

    this.viewerProperties.zoom = zoom;
    this.propertiesSubject.next(this.viewerProperties);
  }

  // Reset zoom and rotation
  resetView(): void {
    if (this.viewer) {
      this.viewer.viewport.goHome();
      this.viewer.viewport.setRotation(0);
      this.viewerProperties.zoom = this.viewer.viewport.getZoom();
      this.viewerProperties.rotation = 0;
      this.propertiesSubject.next(this.viewerProperties);
    }
  }

  // Add rectangle at specific coordinates
  addRectangle(x: number, y: number, width: number = 0.2, height: number = 0.2): void {
    if (!this.viewer) return;

    const rect = new OpenSeadragon.Rect(x, y, width, height);
    const overlay = document.createElement('div');
    overlay.style.background = 'rgba(255, 0, 0, 0.3)';
    overlay.style.border = '2px solid #007bff';
    overlay.style.cursor = 'pointer';
    overlay.style.transition = 'background 0.2s ease';
    overlay.style.pointerEvents = 'none';

    // Add hover handlers
    overlay.addEventListener('mouseenter', () => overlay.style.background = 'rgba(255, 0, 0, 0.5)');
    overlay.addEventListener('mouseleave', () => overlay.style.background = 'rgba(255, 0, 0, 0.3)');

    this.viewer.addOverlay(overlay, rect);
    this.rectangles.set(overlay, rect);
    console.log(`Rectangle ${++this.rectangleCounter} added at x:${x}, y:${y}, width:${width}, height:${height}`);
  }

  // Handle rectangle click
  private onRectangleClick(rect: OpenSeadragon.Rect, overlay: HTMLElement): void {
    console.log('Rectangle clicked:', {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    });

    // Visual feedback
    const originalBorder = overlay.style.border;
    overlay.style.border = '3px solid #00ff00';
    setTimeout(() => overlay.style.border = originalBorder, 300);
  }

  // Get coordinates of a specific rectangle
  getRectangleCoordinates(overlay: HTMLElement): OpenSeadragon.Rect | undefined {
    return this.rectangles.get(overlay);
  }

  // Get all rectangles
  getAllRectangles(): Array<{overlay: HTMLElement, rect: OpenSeadragon.Rect}> {
    return Array.from(this.rectangles.entries()).map(([overlay, rect]) => ({overlay, rect}));
  }

  // Adds rectangle at center of current viewport - just for TEST
  addRectangleAtDefaultPosition(): void {
    if (!this.viewer) return;
    const center = this.viewer.viewport.getCenter();
    this.addRectangle(center.x - 0.1, center.y - 0.1, 0.2, 0.2);
  }

  // Toggle area selection mode
  toggleSelectArea(): void {
    if (!this.viewer) return;

    this.isSelectionMode = !this.isSelectionMode;

    if (this.isSelectionMode) {
      this.enableSelectionMode();
    } else {
      this.disableSelectionMode();
    }
  }

  // Enable selection mode
  private enableSelectionMode(): void {
    if (!this.viewer) return;

    this.viewer.setMouseNavEnabled(false);

    this.mouseTracker = new OpenSeadragon.MouseTracker({
      element: this.viewer.element,
      pressHandler: (event: any) => {
        this.drawStartPoint = this.viewer!.viewport.viewerElementToViewportCoordinates(event.position);
        event.preventDefaultAction = true;
      },
      dragHandler: (event: any) => {
        if (!this.drawStartPoint) return;

        const currentPoint = this.viewer!.viewport.viewerElementToViewportCoordinates(event.position);
        this.clearSelectionOverlays();

        const rect = new OpenSeadragon.Rect(
          Math.min(this.drawStartPoint.x, currentPoint.x),
          Math.min(this.drawStartPoint.y, currentPoint.y),
          Math.abs(currentPoint.x - this.drawStartPoint.x),
          Math.abs(currentPoint.y - this.drawStartPoint.y)
        );

        // Create selection frame
        this.selectionOverlay = document.createElement('div');
        this.selectionOverlay.style.border = '3px solid #00ff00';
        this.selectionOverlay.style.boxShadow = '0 0 10px rgba(0, 255, 0, 0.5)';
        this.selectionOverlay.style.pointerEvents = 'none';
        this.selectionOverlay.style.background = 'transparent';
        this.viewer!.addOverlay(this.selectionOverlay, rect);

        this.createDimOverlays(rect);
        event.preventDefaultAction = true;
      },
      releaseHandler: (event: any) => {
        if (!this.drawStartPoint) return;

        const endPoint = this.viewer!.viewport.viewerElementToViewportCoordinates(event.position);
        const rect = new OpenSeadragon.Rect(
          Math.min(this.drawStartPoint.x, endPoint.x),
          Math.min(this.drawStartPoint.y, endPoint.y),
          Math.abs(endPoint.x - this.drawStartPoint.x),
          Math.abs(endPoint.y - this.drawStartPoint.y)
        );

        console.log('Selected area:', rect);
        this.drawStartPoint = null;
        event.preventDefaultAction = true;
      }
    });
  }

  // Create dim overlays around the selected area
  private createDimOverlays(sel: OpenSeadragon.Rect): void {
    if (!this.viewer) return;

    const home = this.viewer.viewport.getHomeBounds();
    const addDimOverlay = (x: number, y: number, w: number, h: number) => {
      const overlay = document.createElement('div');
      overlay.style.background = 'rgba(0, 0, 0, 0.6)';
      overlay.style.pointerEvents = 'none';
      this.viewer!.addOverlay(overlay, new OpenSeadragon.Rect(x, y, w, h));
      this.dimOverlays.push(overlay);
    };

    // Top, Bottom, Left, Right
    if (sel.y > home.y) addDimOverlay(home.x, home.y, home.width, sel.y - home.y);
    if (sel.y + sel.height < home.y + home.height) addDimOverlay(home.x, sel.y + sel.height, home.width, home.y + home.height - sel.y - sel.height);
    if (sel.x > home.x) addDimOverlay(home.x, sel.y, sel.x - home.x, sel.height);
    if (sel.x + sel.width < home.x + home.width) addDimOverlay(sel.x + sel.width, sel.y, home.x + home.width - sel.x - sel.width, sel.height);
  }

  // Clear selection and dim overlays
  private clearSelectionOverlays(): void {
    if (!this.viewer) return;
    if (this.selectionOverlay) {
      this.viewer.removeOverlay(this.selectionOverlay);
      this.selectionOverlay = null;
    }
    this.dimOverlays.forEach(overlay => this.viewer!.removeOverlay(overlay));
    this.dimOverlays = [];
  }

  // Disable selection mode
  private disableSelectionMode(): void {
    if (!this.viewer) return;
    this.viewer.setMouseNavEnabled(true);
    if (this.mouseTracker) {
      this.mouseTracker.destroy();
      this.mouseTracker = null;
    }
    this.clearSelectionOverlays();
    this.drawStartPoint = null;
  }

  // Clear all overlays
  clearAllOverlays(): void {
    if (!this.viewer) return;
    this.clearSelectionOverlays();
    this.viewer.clearOverlays();
    this.rectangles.clear();
    this.rectangleCounter = 0;
  }

  // Remove specific rectangle
  removeRectangle(overlay: HTMLElement): void {
    if (!this.viewer) return;
    this.viewer.removeOverlay(overlay);
    this.rectangles.delete(overlay);
  }
}
