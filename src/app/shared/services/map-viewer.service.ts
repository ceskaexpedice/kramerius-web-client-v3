import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

/**
 * Wraps an Allmaps `AllmapsViewer` instance and exposes a reactive,
 * Angular-friendly API for georeferenced map viewers.
 *
 * Provided per-component (`providedIn: 'any'`) so each viewer instance
 * has its own state — do not register at root.
 */
export type BasemapPreset = {
  value: string;
  label: string;
  type: 'xyz';
  url: string;
  attribution?: string;
  maxZoom?: number;
};

export type OutlineMode = 'mask' | 'bbox';
export type OutlineFillMode = 'fill' | 'none';

export type BackgroundRemovalOptions = {
  enabled: boolean;
  color?: string;
  threshold?: number;
  hardness?: number;
  invert?: boolean;
};

export type ViewportBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export type ViewportState = {
  bounds: ViewportBounds;
  center: { lon: number; lat: number };
  zoom: number;
};

@Injectable()
export class MapViewerService {

  private viewer: any = null;

  private opacitySubject = new BehaviorSubject<number>(100);
  public opacity$ = this.opacitySubject.asObservable();

  private outlinesVisibleSubject = new BehaviorSubject<boolean>(false);
  public outlinesVisible$ = this.outlinesVisibleSubject.asObservable();

  private basemapVisibleSubject = new BehaviorSubject<boolean>(true);
  public basemapVisible$ = this.basemapVisibleSubject.asObservable();

  private currentBasemapSubject = new BehaviorSubject<string | null>(null);
  public currentBasemap$ = this.currentBasemapSubject.asObservable();

  private mapIdsSubject = new BehaviorSubject<string[]>([]);
  public mapIds$ = this.mapIdsSubject.asObservable();

  private backgroundRemovalSubject = new BehaviorSubject<BackgroundRemovalOptions>({
    enabled: false,
    color: '#ffffff',
    threshold: 0.1,
    hardness: 0.7,
    invert: false
  });
  public backgroundRemoval$ = this.backgroundRemovalSubject.asObservable();

  private viewportStateSubject = new BehaviorSubject<ViewportState | null>(null);
  public viewportState$ = this.viewportStateSubject.asObservable();

  /**
   * Bind a created AllmapsViewer instance. Called by the host component
   * after `createAllmapsViewer(...)`. Re-applies any state set before
   * the viewer was ready (so callers can configure the service first).
   */
  attachViewer(viewer: any): void {
    this.viewer = viewer;

    // Re-apply pending state to the freshly attached viewer
    viewer.setOpacity(this.opacitySubject.value / 100);
    this.applyBackgroundRemoval(this.backgroundRemovalSubject.value);

    // Wire up viewport change events
    viewer.on?.('viewportchange', (event: CustomEvent) => {
      this.viewportStateSubject.next(event.detail as ViewportState);
    });
    viewer.on?.('ready', () => {
      this.refreshMapIds();
    });
  }

  detachViewer(): void {
    this.viewer = null;
    this.viewportStateSubject.next(null);
    this.mapIdsSubject.next([]);
  }

  getViewer(): any {
    return this.viewer;
  }

  // --- Maps -----------------------------------------------------------------

  /** Replace all currently displayed maps with the given set. */
  async setMaps(maps: any[]): Promise<void> {
    if (!this.viewer) return;
    await this.viewer.setMaps(maps);
    this.refreshMapIds();
  }

  /** Add maps to the existing set (stacking / composition). */
  async addMaps(maps: any[]): Promise<void> {
    if (!this.viewer) return;
    await this.viewer.addMaps(maps);
    this.refreshMapIds();
  }

  /** Remove a single map by id. */
  async removeMap(mapId: string): Promise<void> {
    if (!this.viewer) return;
    await this.viewer.removeMap(mapId);
    this.refreshMapIds();
  }

  async clearMaps(): Promise<void> {
    if (!this.viewer) return;
    await this.viewer.clearMaps();
    this.refreshMapIds();
  }

  setMapVisibility(mapId: string, visible: boolean): void {
    this.viewer?.setMapVisibility?.(mapId, visible);
  }

  // --- Z-order / stacking ---------------------------------------------------

  bringMapsForward(mapIds: Iterable<string>): void {
    this.viewer?.bringMapsForward?.(mapIds);
    this.refreshMapIds();
  }

  sendMapsBackward(mapIds: Iterable<string>): void {
    this.viewer?.sendMapsBackward?.(mapIds);
    this.refreshMapIds();
  }

  bringMapsToFront(mapIds: Iterable<string>): void {
    this.viewer?.bringMapsToFront?.(mapIds);
    this.refreshMapIds();
  }

  sendMapsToBack(mapIds: Iterable<string>): void {
    this.viewer?.sendMapsToBack?.(mapIds);
    this.refreshMapIds();
  }

  // --- Viewport / fit -------------------------------------------------------

  fitToMaps(): void {
    this.viewer?.fitToMaps?.();
  }

  fitToMap(mapId: string): void {
    this.viewer?.fitToMap?.(mapId);
  }

  resize(): void {
    this.viewer?.resize?.();
  }

  // --- Opacity --------------------------------------------------------------

  /** @param percent 0..100 */
  setOpacity(percent: number): void {
    const clamped = Math.max(0, Math.min(100, percent));
    this.opacitySubject.next(clamped);
    this.viewer?.setOpacity?.(clamped / 100);
  }

  // --- Outlines -------------------------------------------------------------

  setOutlinesVisible(visible: boolean): void {
    this.outlinesVisibleSubject.next(visible);
    this.viewer?.setOutlinesVisible?.(visible);
  }

  toggleOutlines(): void {
    this.setOutlinesVisible(!this.outlinesVisibleSubject.value);
  }

  setOutlineStyle(style: { strokeColor?: string; strokeWidth?: number; fillColor?: string }): void {
    this.viewer?.setOutlineStyle?.(style);
  }

  setOutlineFillMode(mode: OutlineFillMode): void {
    this.viewer?.setOutlineFillMode?.(mode);
  }

  setOutlinedMapIds(mapIds: Iterable<string>): void {
    this.viewer?.setOutlinedMapIds?.(mapIds);
  }

  setPreviewMode(mode: OutlineMode): void {
    this.viewer?.setPreviewMode?.(mode);
  }

  // --- Basemap --------------------------------------------------------------

  getBasemapPresets(): BasemapPreset[] {
    return this.viewer?.getBasemapPresets?.() ?? [];
  }

  /**
   * Switch the basemap.
   * @param basemap preset id ('osm' | 'esri-world-topo' | ...) or false to hide entirely
   */
  setBasemap(basemap: string | false): void {
    this.viewer?.setBasemap?.(basemap);
    this.currentBasemapSubject.next(basemap === false ? null : basemap);
  }

  setBasemapVisible(visible: boolean): void {
    this.basemapVisibleSubject.next(visible);
    this.viewer?.setBasemapVisible?.(visible);
  }

  toggleBasemap(): void {
    this.setBasemapVisible(!this.basemapVisibleSubject.value);
  }

  // --- Image processing -----------------------------------------------------

  /**
   * Toggle/configure background removal on the warped map layer.
   * Wraps Allmaps WebGL2 `removeColor*` uniforms.
   */
  setBackgroundRemoval(options: Partial<BackgroundRemovalOptions> & { enabled: boolean }): void {
    const merged: BackgroundRemovalOptions = {
      ...this.backgroundRemovalSubject.value,
      ...options
    };
    this.backgroundRemovalSubject.next(merged);
    this.applyBackgroundRemoval(merged);
  }

  /**
   * Allmaps "enhance lines" effect — boost dark linework, reduce paper background.
   * @param threshold 0..1 (0 = no enhancement, 1 = max)
   */
  setEnhanceLines(threshold: number): void {
    this.viewer?.setEnhanceLines?.(threshold);
  }

  // --- Internals ------------------------------------------------------------

  private applyBackgroundRemoval(opts: BackgroundRemovalOptions): void {
    this.viewer?.warpedMapLayer?.setLayerOptions?.({
      removeColor: opts.enabled,
      removeColorColor: opts.color ?? '#ffffff',
      removeColorThreshold: opts.threshold ?? 0.1,
      removeColorHardness: opts.hardness ?? 0.7,
      removeColorInvert: opts.invert ?? false
    });
  }

  private refreshMapIds(): void {
    this.mapIdsSubject.next(this.viewer?.getMapIds?.() ?? []);
  }
}
