import { Injectable, inject } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import OpenSeadragon from 'openseadragon';
import { AltoService } from './alto.service';

export interface IIIFViewerProperties {
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  fullscreen: boolean;
  bookMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IIIFViewerService {

  // Box/Overlay Styling Configuration - Customize these values to change appearance
  private readonly BOX_STYLES = {
    // Search highlight boxes
    search: {
      default: {
        background: 'rgba(0, 123, 255, 0.1)',
        border: '2px solid var(--color-primary)',
        borderRadius: '4px',
        cursor: 'pointer'
      },
      active: {
        background: 'rgba(0, 123, 255, 0.1)',
        border: '2px solid var(--color-primary)',
        cursor: 'pointer'
      },
      hover: {
        background: 'rgba(0, 123, 255, 0.2)',
      }
    },
    // Selection mode overlays
    selection: {
      frame: {
        boxShadow: '',
        background: 'transparent'
      },
      dim: {
        background: 'rgba(0, 0, 0, 0.4)'
      }
    },
    // Generic rectangles
    rectangle: {
      default: {
        background: 'rgba(255, 0, 0, 0.3)',
        border: '2px solid #007bff',
        cursor: 'pointer'
      },
      hover: {
        background: 'rgba(255, 0, 0, 0.5)'
      },
      clicked: {
        border: '3px solid #00ff00'
      }
    },
    // Common properties
    common: {
      transition: 'background 0.2s ease, border 0.2s ease',
      pointerEvents: 'none' as const
    }
  };

  viewerProperties: IIIFViewerProperties = {
    zoom: 1,
    rotation: 0,
    fullscreen: false,
    bookMode: false
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
  private fullscreenComponentGetter: (() => any) | null = null;

  private bookModeSubject = new BehaviorSubject<boolean>(false);
  public bookMode$ = this.bookModeSubject.asObservable();

  private testFallbackMode = false;

  private altoService = inject(AltoService);

  // Search matches tracking
  private searchMatches: Array<{ rect: OpenSeadragon.Rect; overlay: HTMLElement }> = [];
  private currentMatchIndexSubject = new BehaviorSubject<number>(-1);
  private totalMatchesSubject = new BehaviorSubject<number>(0);
  private searchQuerySubject = new BehaviorSubject<string>('');

  public currentMatchIndex$ = this.currentMatchIndexSubject.asObservable();
  public totalMatches$ = this.totalMatchesSubject.asObservable();
  public searchQuery$ = this.searchQuerySubject.asObservable();

  // Image loading events
  private imageLoadedSubject = new Subject<void>();
  public imageLoaded$ = this.imageLoadedSubject.asObservable();

  private selectedAreaSubject = new BehaviorSubject<OpenSeadragon.Rect | null>(null);
  public selectedArea$ = this.selectedAreaSubject.asObservable();

  private isSelectionModeSubject = new BehaviorSubject<boolean>(false);
  public isSelectionMode$ = this.isSelectionModeSubject.asObservable();

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
    // If testing fallback, return invalid URL to trigger error
    if (this.testFallbackMode) {
      console.warn('TEST_FALLBACK is enabled - returning invalid URL to test error handling');
      return `https://invalid-url.example.com/fake-${pid}-info.json`;
    }
    return `${this.API_URL}/search/iiif/${pid}/info.json`;
  }

  // Enable/disable test fallback mode
  setTestFallbackMode(enabled: boolean): void {
    this.testFallbackMode = enabled;
    console.log(`Test fallback mode ${enabled ? 'ENABLED' : 'DISABLED'}`);
  }

  // Get direct image URL (fallback when IIIF fails)
  getDirectImageUrl(pid: string): string {
    const itemsUrl = this.env.getApiUrl('items');
    return `${itemsUrl}/${pid}/image`;
  }

  // Set viewer instance
  setViewer(viewer: OpenSeadragon.Viewer): void {
    this.viewer = viewer;
    this.setupRectangleClickHandler();
    this.setupImageLoadedHandler();
  }

  // Setup handler to emit when image is fully loaded
  private setupImageLoadedHandler(): void {
    if (!this.viewer) return;

    let imageLoadTimeout: any = null;

    // Listen for when all tiles at the current level are fully loaded
    this.viewer.addHandler('tile-loaded', () => {
      // Clear any existing timeout
      if (imageLoadTimeout) {
        clearTimeout(imageLoadTimeout);
      }

      // Debounce: wait a bit to ensure all visible tiles are loaded
      imageLoadTimeout = setTimeout(() => {
        const tiledImage = this.viewer?.world.getItemAt(0);
        if (tiledImage) {

          const fullyLoaded = tiledImage.getFullyLoaded();
          if (fullyLoaded) {
            console.log('Image fully loaded and ready');
            this.imageLoadedSubject.next();
          }
        }
        imageLoadTimeout = null;
      }, 50);
    });

    // Listen for when the viewer finishes updating (after pan, zoom, or navigation)
    this.viewer.addHandler('update-viewport', () => {
      // Clear any existing timeout
      if (imageLoadTimeout) {
        clearTimeout(imageLoadTimeout);
      }

      // Debounce: wait for viewport updates to settle
      imageLoadTimeout = setTimeout(() => {
        const tiledImage = this.viewer?.world.getItemAt(0);
        if (tiledImage) {
          const fullyLoaded = tiledImage.getFullyLoaded();
          if (fullyLoaded) {
            console.log('Viewport updated, image ready');
            this.imageLoadedSubject.next();
          }
        }
        imageLoadTimeout = null;
      }, 50);
    });

    // Listen for the open event (when a new image starts loading)
    this.viewer.addHandler('open', () => {
      console.log('New image opened in viewer');
      // Clear any pending timeouts when a new image opens
      if (imageLoadTimeout) {
        clearTimeout(imageLoadTimeout);
        imageLoadTimeout = null;
      }
    });
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
      fullscreen: false,
      bookMode: false
    };
    this.propertiesSubject.next(this.viewerProperties);

    // Reset selection mode if active
    if (this.isSelectionMode) {
      this.disableSelectionMode();
      this.isSelectionMode = false;
      this.isSelectionModeSubject.next(false);
    }

    // Clear all overlays and counters
    this.rectangleCounter = 0;
    this.dimOverlays = [];
    this.rectangles.clear();

    // Clear search state
    this.clearSearchState();
    this.bookModeSubject.next(false);
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
  setFullscreenComponent(getter: () => any): void {
    this.fullscreenComponentGetter = getter;
  }

  toggleFullscreen(): void {
    if (this.fullscreenComponentGetter) {
      const component = this.fullscreenComponentGetter();
      if (component) {
        component.toggle();
      }
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
    overlay.style.background = this.BOX_STYLES.rectangle.default.background;
    overlay.style.border = this.BOX_STYLES.rectangle.default.border;
    overlay.style.cursor = this.BOX_STYLES.rectangle.default.cursor;
    overlay.style.transition = this.BOX_STYLES.common.transition;
    overlay.style.pointerEvents = this.BOX_STYLES.common.pointerEvents;

    // Add hover handlers
    overlay.addEventListener('mouseenter', () => overlay.style.background = this.BOX_STYLES.rectangle.hover.background);
    overlay.addEventListener('mouseleave', () => overlay.style.background = this.BOX_STYLES.rectangle.default.background);

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
    overlay.style.border = this.BOX_STYLES.rectangle.clicked.border;
    setTimeout(() => overlay.style.border = originalBorder, 300);
  }

  // Get coordinates of a specific rectangle
  getRectangleCoordinates(overlay: HTMLElement): OpenSeadragon.Rect | undefined {
    return this.rectangles.get(overlay);
  }

  // Get all rectangles
  getAllRectangles(): Array<{ overlay: HTMLElement, rect: OpenSeadragon.Rect }> {
    return Array.from(this.rectangles.entries()).map(([overlay, rect]) => ({ overlay, rect }));
  }

  // Adds rectangle at center of current viewport - just for TEST
  addRectangleAtDefaultPosition(): void {
    if (!this.viewer) return;
    const center = this.viewer.viewport.getCenter();
    this.addRectangle(center.x - 0.1, center.y - 0.1, 0.2, 0.2);
  }

  // Toggle area selection mode
  toggleSelectArea(): void {
    this.setSelectionMode(!this.isSelectionMode);
  }

  setSelectionMode(enabled: boolean): void {
    if (!this.viewer) return;

    if (enabled && !this.isSelectionMode) {
      this.isSelectionMode = true;
      this.isSelectionModeSubject.next(true);
      this.enableSelectionMode();
    } else if (!enabled && this.isSelectionMode) {
      this.isSelectionMode = false;
      this.isSelectionModeSubject.next(false);
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
        // this.selectionOverlay.style.border = this.BOX_STYLES.selection.frame.border;
        this.selectionOverlay.style.boxShadow = this.BOX_STYLES.selection.frame.boxShadow;
        this.selectionOverlay.style.pointerEvents = this.BOX_STYLES.common.pointerEvents;
        this.selectionOverlay.style.background = this.BOX_STYLES.selection.frame.background;
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

        console.log('Selected area (viewport):', rect);

        // Convert to image coordinates
        const imageRect = this.viewer!.viewport.viewportToImageRectangle(rect);
        console.log('Selected area (image):', imageRect);
        this.selectedAreaSubject.next(imageRect);

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
      overlay.style.background = this.BOX_STYLES.selection.dim.background;
      overlay.style.pointerEvents = this.BOX_STYLES.common.pointerEvents;
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
      //this.clearSearchState();
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
    const style = isActive ? this.BOX_STYLES.search.active : this.BOX_STYLES.search.default;
    overlay.style.background = style.background;
    overlay.style.border = style.border;
    overlay.style.cursor = style.cursor;
    overlay.style.transition = this.BOX_STYLES.common.transition;
    overlay.style.pointerEvents = this.BOX_STYLES.common.pointerEvents;
    overlay.style.borderRadius = this.BOX_STYLES.search.default.borderRadius;
    return overlay;
  }

  /**
   * Updates the styling of search overlays to highlight the active match
   * @param activeIndex - Index of the active match
   */
  private updateSearchOverlayStyles(activeIndex: number): void {
    this.searchMatches.forEach((match, index) => {
      const isActive = index === activeIndex;
      const style = isActive ? this.BOX_STYLES.search.active : this.BOX_STYLES.search.default;
      match.overlay.style.background = style.background;
      match.overlay.style.border = style.border;
      match.overlay.style.borderRadius = this.BOX_STYLES.search.default.borderRadius;
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

    // Remove fulltext parameter from URL
    const url = new URL(window.location.href);
    url.searchParams.delete('fulltext');
    window.history.replaceState({}, '', url.toString());
  }

  /**
   * Sets the search query without displaying highlights
   * Used when restoring search state from URL
   * @param searchTerm - The search term to set
   */
  setSearchQuery(searchTerm: string): void {
    this.searchQuerySubject.next(searchTerm);
  }

  /**
   * Toggle book mode (dual-page view)
   * When enabled, displays two pages side by side
   */
  toggleBookMode(): void {
    const newBookMode = !this.viewerProperties.bookMode;
    this.viewerProperties.bookMode = newBookMode;
    this.bookModeSubject.next(newBookMode);
    this.propertiesSubject.next(this.viewerProperties);
  }

  /**
   * Check if book mode is currently active
   */
  isBookMode(): boolean {
    return this.viewerProperties.bookMode;
  }

  /**
   * Update viewer to display pages according to book mode state
   * @param currentPagePid - The current page PID
   * @param nextPagePid - The next page PID (for book mode)
   */
  updateBookModeDisplay(currentPagePid: string, nextPagePid: string | null): void {
    if (!this.viewer) {
      console.warn('Viewer not initialized');
      return;
    }

    // Clear existing overlays when changing pages
    this.clearAllOverlays();

    try {
      if (this.viewerProperties.bookMode && nextPagePid) {
        // Book mode: Display two pages side by side
        const leftPageUrl = this.getIIIFInfoUrl(currentPagePid);
        const rightPageUrl = this.getIIIFInfoUrl(nextPagePid);

        this.viewer.open([
          {
            tileSource: leftPageUrl,
            x: 0,
            y: 0,
            width: 0.5
          },
          {
            tileSource: rightPageUrl,
            x: 0.5,
            y: 0,
            width: 0.5
          }
        ]);
      } else {
        // Single page mode
        const pageUrl = this.getIIIFInfoUrl(currentPagePid);
        console.log(`Opening single page: ${currentPagePid}`);
        this.viewer.open(pageUrl);
      }
    } catch (error) {
      console.error('Error updating book mode display:', error);
      // Error will be caught by open-failed handler in component
    }
  }
}
