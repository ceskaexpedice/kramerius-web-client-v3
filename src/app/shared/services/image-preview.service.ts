import { Injectable, signal } from '@angular/core';

export interface ImagePreviewItem {
  url: string;
  altText?: string;
  metadata?: any; // Optional metadata like page number, title, etc.
}

@Injectable({
  providedIn: 'root'
})
export class ImagePreviewService {
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
    // Reset state after animation completes
    setTimeout(() => {
      this._images.set([]);
      this._currentIndex.set(0);
    }, 300);
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
}
