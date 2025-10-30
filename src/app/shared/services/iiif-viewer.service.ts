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
      if (this.viewerProperties.fullscreen) {
        this.viewer.setFullScreen(true);
      } else {
        this.viewer.setFullScreen(false);
      }
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
    if (this.viewer) {
      // Fit to width by adjusting viewport bounds
      const bounds = this.viewer.viewport.getBounds();
      const containerSize = this.viewer.viewport.getContainerSize();
      const aspectRatio = containerSize.y / containerSize.x;

      // Adjust bounds to fit width
      bounds.height = bounds.width * aspectRatio;
      this.viewer.viewport.fitBounds(bounds, true);

      this.viewerProperties.zoom = this.viewer.viewport.getZoom();
      this.propertiesSubject.next(this.viewerProperties);
    }
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
}
