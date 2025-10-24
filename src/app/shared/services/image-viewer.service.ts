import { Injectable } from '@angular/core';
import { EnvironmentService } from './environment.service';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ImageViewerProperties {
  zoom: number;
  rotation: 0 | 90 | 180 | 270;
  fullscreen: boolean;
  fitToScreen: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ImageViewerService {

  imageViewerProperties: ImageViewerProperties = {
    zoom: 100,
    rotation: 0,
    fullscreen: false,
    fitToScreen: false
  }

  _uuid: string | null = null;
  private currentPageSubject = new BehaviorSubject<number>(1);
  public currentPage$: Observable<number> = this.currentPageSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(0);
  public totalPages$: Observable<number> = this.totalPagesSubject.asObservable();

  // Subject for image properties changes
  private propertiesSubject = new BehaviorSubject<ImageViewerProperties>(this.imageViewerProperties);
  public properties$: Observable<ImageViewerProperties> = this.propertiesSubject.asObservable();

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
      console.warn('ImageViewerService: API URL not available. Environment may not be loaded yet.');
      return '';
    }
    return url;
  }

  get url(): string | null {
    return this.uuid ? `${this.API_URL}/${this.uuid}/image` : null;
  }

  // Set current page number
  setCurrentPage(page: number): void {
    this.currentPageSubject.next(page);
  }

  // Set total pages
  setTotalPages(total: number): void {
    this.totalPagesSubject.next(total);
  }

  // Get current page value
  getCurrentPage(): number {
    return this.currentPageSubject.value;
  }

  // Get total pages value
  getTotalPages(): number {
    return this.totalPagesSubject.value;
  }

  // Navigate to next page
  nextPage(): void {
    const current = this.getCurrentPage();
    const total = this.getTotalPages();
    if (current < total) {
      this.setCurrentPage(current + 1);
    }
  }

  // Navigate to previous page
  previousPage(): void {
    const current = this.getCurrentPage();
    if (current > 1) {
      this.setCurrentPage(current - 1);
    }
  }

  // Reset all state
  private resetState(): void {
    this.currentPageSubject.next(1);
    this.totalPagesSubject.next(0);
    this.imageViewerProperties = {
      zoom: 100,
      rotation: 0,
      fullscreen: false,
      fitToScreen: false
    };
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  // Zoom controls
  zoomIn(): void {
    if (this.imageViewerProperties.fitToScreen) {
      this.imageViewerProperties.fitToScreen = false;
    }
    this.imageViewerProperties.zoom += 10;
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  zoomOut(): void {
    if (this.imageViewerProperties.fitToScreen) {
      this.imageViewerProperties.fitToScreen = false;
    }
    this.imageViewerProperties.zoom = Math.max(10, this.imageViewerProperties.zoom - 10);
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  // Rotation controls
  setRotation(rotation: 0 | 90 | 180 | 270): void {
    this.imageViewerProperties.rotation = rotation;
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  toggleRotation(): void {
    if (this.imageViewerProperties.rotation === 0) {
      this.imageViewerProperties.rotation = 90;
    } else if (this.imageViewerProperties.rotation === 90) {
      this.imageViewerProperties.rotation = 180;
    } else if (this.imageViewerProperties.rotation === 180) {
      this.imageViewerProperties.rotation = 270;
    } else {
      this.imageViewerProperties.rotation = 0;
    }
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  // Fullscreen control
  toggleFullscreen(): void {
    this.imageViewerProperties.fullscreen = !this.imageViewerProperties.fullscreen;
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  // Fit to screen control
  fitToScreen(): void {
    this.imageViewerProperties.fitToScreen = !this.imageViewerProperties.fitToScreen;
    if (this.imageViewerProperties.fitToScreen) {
      this.imageViewerProperties.zoom = 100; // Reset zoom when fitting to screen
    }
    this.propertiesSubject.next(this.imageViewerProperties);
  }

  // Reset zoom and rotation
  resetView(): void {
    this.imageViewerProperties.zoom = 100;
    this.imageViewerProperties.rotation = 0;
    this.imageViewerProperties.fitToScreen = false;
    this.propertiesSubject.next(this.imageViewerProperties);
  }
}
