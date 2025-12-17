import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { PreviewNavigationBarComponent } from '../preview-navigation-bar/preview-navigation-bar.component';
import { ImagePreviewService } from '../../services/image-preview.service';

@Component({
  selector: 'app-image-preview-overlay',
  standalone: true,
  imports: [NgIf, PreviewNavigationBarComponent],
  templateUrl: './image-preview-overlay.component.html',
  styleUrl: './image-preview-overlay.component.scss'
})
export class ImagePreviewOverlayComponent {
  private previewService = inject(ImagePreviewService);

  // Subscribe to service state
  isOpen = this.previewService.isOpen;
  images = this.previewService.images;
  currentIndex = this.previewService.currentIndex;

  // Computed values
  currentImage = computed(() => {
    const images = this.images();
    const index = this.currentIndex();
    return images[index] || null;
  });

  displayIndex = computed(() => this.currentIndex() + 1);
  totalItems = computed(() => this.images().length);

  isLoading = signal(true);

  constructor() {
    // Reset loading state when image changes
    effect(() => {
      const image = this.currentImage();
      if (image) {
        this.isLoading.set(true);
      }
    });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
    if (!this.isOpen()) return;

    switch (event.key) {
      case 'Escape':
        this.onClose();
        break;
      case 'ArrowLeft':
        this.onPrevious();
        break;
      case 'ArrowRight':
        this.onNext();
        break;
    }
  }

  onPrevious(): void {
    this.previewService.previous();
  }

  onNext(): void {
    this.previewService.next();
  }

  onClose(): void {
    this.previewService.close();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('image-preview-overlay__backdrop')) {
      this.onClose();
    }
  }

  onImageLoad(): void {
    this.isLoading.set(false);
  }

  onImageError(): void {
    this.isLoading.set(false);
  }
}
