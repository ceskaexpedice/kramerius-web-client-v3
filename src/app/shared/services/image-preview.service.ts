import { ComponentRef, Injectable, Injector, signal, inject } from '@angular/core';
import { Overlay, OverlayConfig, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { ImagePreviewOverlayComponent } from '../components/image-preview-overlay/image-preview-overlay.component';

export interface ImagePreviewItem {
  url: string;
  altText?: string;
  metadata?: any; // Optional metadata like page number, title, etc.
}

@Injectable({
  providedIn: 'root'
})
export class ImagePreviewService {
  private overlay = inject(Overlay);
  private injector = inject(Injector);

  private overlayRef: OverlayRef | null = null;
  private componentRef: ComponentRef<ImagePreviewOverlayComponent> | null = null;

  // State signals
  private _isOpen = signal(false);
  private _images = signal<ImagePreviewItem[]>([]);
  private _currentIndex = signal(0);

  // Public readonly signals
  readonly isOpen = this._isOpen.asReadonly();
  readonly images = this._images.asReadonly();
  readonly currentIndex = this._currentIndex.asReadonly();

  /**
   * Show the image preview overlay with a list of images
   * @param images Array of images to preview
   * @param startIndex Optional starting index (default: 0)
   */
  show(images: ImagePreviewItem[], startIndex: number = 0): void {
    if (!images || images.length === 0) {
      console.warn('ImagePreviewService: Cannot show preview with empty images array');
      return;
    }

    const clampedIndex = Math.max(0, Math.min(startIndex, images.length - 1));

    this._images.set(images);
    this._currentIndex.set(clampedIndex);
    this._isOpen.set(true);

    if (!this.overlayRef) {
      this.createOverlay();
    }
  }

  /**
   * Show a single image
   * @param imageUrl URL of the image to preview
   * @param altText Optional alt text for the image
   */
  showSingle(imageUrl: string, altText?: string): void {
    this.show([{ url: imageUrl, altText }], 0);
  }

  /**
   * Navigate to the previous image
   */
  previous(): void {
    const currentIdx = this._currentIndex();
    if (currentIdx > 0) {
      this._currentIndex.set(currentIdx - 1);
    }
  }

  /**
   * Navigate to the next image
   */
  next(): void {
    const currentIdx = this._currentIndex();
    const totalImages = this._images().length;
    if (currentIdx < totalImages - 1) {
      this._currentIndex.set(currentIdx + 1);
    }
  }

  /**
   * Go to a specific image by index
   * @param index Index of the image to show
   */
  goToIndex(index: number): void {
    const totalImages = this._images().length;
    const clampedIndex = Math.max(0, Math.min(index, totalImages - 1));
    this._currentIndex.set(clampedIndex);
  }

  /**
   * Close the image preview overlay
   */
  close(): void {
    this._isOpen.set(false);

    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
      this.componentRef = null;
    }

    this._images.set([]);
    this._currentIndex.set(0);
  }

  /**
   * Get the current image being displayed
   */
  getCurrentImage(): ImagePreviewItem | null {
    const images = this._images();
    const index = this._currentIndex();
    return images[index] || null;
  }

  /**
   * Check if there's a previous image available
   */
  hasPrevious(): boolean {
    return this._currentIndex() > 0;
  }

  /**
   * Check if there's a next image available
   */
  hasNext(): boolean {
    const currentIdx = this._currentIndex();
    const totalImages = this._images().length;
    return currentIdx < totalImages - 1;
  }

  /**
   * Get the total number of images
   */
  getTotalImages(): number {
    return this._images().length;
  }

  private createOverlay() {
    const overlayConfig = new OverlayConfig({
      hasBackdrop: false, // The component itself has a backdrop div
      scrollStrategy: this.overlay.scrollStrategies.block(),
      positionStrategy: this.overlay.position().global().centerHorizontally().centerVertically(),
      width: '100vw',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      panelClass: 'image-preview-overlay-container'
    });

    this.overlayRef = this.overlay.create(overlayConfig);

    // Attach the component
    const portal = new ComponentPortal(ImagePreviewOverlayComponent, null, this.injector);
    this.componentRef = this.overlayRef.attach(portal);
  }
}
