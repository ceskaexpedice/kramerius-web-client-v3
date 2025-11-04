import { Injectable, inject } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { BehaviorSubject, Observable } from 'rxjs';
import OpenSeadragon from 'openseadragon';
import { AltoService } from './alto.service';

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

  private altoService = inject(AltoService);

  // Search matches tracking
  private searchMatches: Array<{ rect: OpenSeadragon.Rect; overlay: HTMLElement }> = [];
  private currentMatchIndexSubject = new BehaviorSubject<number>(-1);
  private totalMatchesSubject = new BehaviorSubject<number>(0);
  private searchQuerySubject = new BehaviorSubject<string>('');

  public currentMatchIndex$ = this.currentMatchIndexSubject.asObservable();
  public totalMatches$ = this.totalMatchesSubject.asObservable();
  public searchQuery$ = this.searchQuerySubject.asObservable();

  get currentMatchNumber(): number {
    return this.currentMatchIndexSubject.value + 1;
  }

  get totalMatches(): number {
    return this.totalMatchesSubject.value;
  }

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

    // Clear search state
    this.clearSearchState();
  }

  // Clear search state
  private clearSearchState(): void {
    this.searchMatches = [];
    this.currentMatchIndexSubject.next(-1);
    this.totalMatchesSubject.next(0);
    this.searchQuerySubject.next('');
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

  /**
   * Displays search result highlights on the IIIF viewer
   * Handles ALTO XML parsing, coordinate conversion, and rectangle drawing
   * @param altoXml - ALTO XML string
   * @param searchTerm - Search term to highlight
   * @returns Number of rectangles displayed, or -1 if error
   */
  displaySearchHighlights(altoXml: string, searchTerm: string): number {
    if (!this.viewer) {
      console.warn('IIIF Viewer not initialized');
      return -1;
    }

    // Update search query
    this.searchQuerySubject.next(searchTerm);

    // Get the image dimensions from the viewer
    const tiledImage = this.viewer.world.getItemAt(0);
    if (!tiledImage) {
      console.warn('No tiled image found in viewer');
      return -1;
    }

    const contentSize = tiledImage.getContentSize();
    const imageWidth = contentSize.x;
    const imageHeight = contentSize.y;

    // Get ALTO dimensions
    const altoDims = this.altoService.getAltoDimensions(altoXml);

    if (altoDims.width === 0 || altoDims.height === 0) {
      console.error('Invalid ALTO dimensions');
      return -1;
    }

    // Parse ALTO and get bounding boxes (in ALTO coordinates)
    const boxes = this.altoService.getBoxes(altoXml, searchTerm);

    if (boxes.length === 0) {
      console.warn('No matches found in ALTO for search term:', searchTerm);
      this.clearSearchState();
      return 0;
    }

    console.log(`Found ${boxes.length} matches for "${searchTerm}"`);

    // Calculate scale factors
    const scaleX = imageWidth / altoDims.width;
    const scaleY = imageHeight / altoDims.height;

    // Clear existing overlays and search state
    this.clearAllOverlays();
    this.searchMatches = [];

    // Add rectangles for each match
    // OpenSeadragon normalizes based on image WIDTH, not height!
    boxes.forEach((box, index) => {
      // Scale to image coordinates
      const imgX = box.x * scaleX;
      const imgY = box.y * scaleY;
      const imgW = box.width * scaleX;
      const imgH = box.height * scaleY;

      // Normalize to OpenSeadragon coordinates
      // IMPORTANT: OpenSeadragon uses width as the normalization basis!
      const normalizedX = imgX / imageWidth;
      const normalizedY = imgY / imageWidth;  // Divide by WIDTH, not height!
      const normalizedW = imgW / imageWidth;
      const normalizedH = imgH / imageWidth;  // Divide by WIDTH, not height!

      const rect = new OpenSeadragon.Rect(normalizedX, normalizedY, normalizedW, normalizedH);
      const overlay = this.createSearchOverlay(index === 0); // Highlight first match

      this.viewer?.addOverlay(overlay, rect);
      this.rectangles.set(overlay, rect);
      this.searchMatches.push({ rect, overlay });
    });

    // Update search state
    this.totalMatchesSubject.next(boxes.length);
    this.currentMatchIndexSubject.next(0);

    return boxes.length;
  }

  /**
   * Creates an overlay element for search results
   * @param isActive - Whether this is the currently active match
   * @returns HTMLElement for the overlay
   */
  private createSearchOverlay(isActive: boolean = false): HTMLElement {
    const overlay = document.createElement('div');
    overlay.style.background = isActive ? 'rgba(255, 165, 0, 0.4)' : 'rgba(255, 0, 0, 0.3)';
    overlay.style.border = isActive ? '2px solid #ff8c00' : '2px solid #007bff';
    overlay.style.cursor = 'pointer';
    overlay.style.transition = 'background 0.2s ease, border 0.2s ease';
    overlay.style.pointerEvents = 'none';
    return overlay;
  }

  /**
   * Updates the styling of search overlays to highlight the active match
   * @param activeIndex - Index of the active match
   */
  private updateSearchOverlayStyles(activeIndex: number): void {
    this.searchMatches.forEach((match, index) => {
      const isActive = index === activeIndex;
      match.overlay.style.background = isActive ? 'rgba(255, 165, 0, 0.4)' : 'rgba(255, 0, 0, 0.3)';
      match.overlay.style.border = isActive ? '2px solid #ff8c00' : '2px solid #007bff';
    });
  }

  /**
   * Navigate to the next search match
   */
  goToNextMatch(): void {
    const current = this.currentMatchIndexSubject.value;
    const total = this.totalMatchesSubject.value;

    if (total === 0) return;

    const nextIndex = (current + 1) % total;
    this.currentMatchIndexSubject.next(nextIndex);
    this.updateSearchOverlayStyles(nextIndex);
  }

  /**
   * Navigate to the previous search match
   */
  goToPreviousMatch(): void {
    const current = this.currentMatchIndexSubject.value;
    const total = this.totalMatchesSubject.value;

    if (total === 0) return;

    const prevIndex = (current - 1 + total) % total;
    this.currentMatchIndexSubject.next(prevIndex);
    this.updateSearchOverlayStyles(prevIndex);
  }

  /**
   * Clear search query and highlights
   */
  clearSearch(): void {
    this.clearAllOverlays();
    this.clearSearchState();
  }
}
