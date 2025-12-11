import { Component, EventEmitter, HostListener, Input, Output } from '@angular/core';
import { NgIf } from '@angular/common';
import { PreviewNavigationBarComponent } from '../preview-navigation-bar/preview-navigation-bar.component';

@Component({
  selector: 'app-image-preview-overlay',
  standalone: true,
  imports: [NgIf, PreviewNavigationBarComponent],
  templateUrl: './image-preview-overlay.component.html',
  styleUrl: './image-preview-overlay.component.scss'
})
export class ImagePreviewOverlayComponent {
  @Input() imageUrl: string = '';
  @Input() altText: string = '';
  @Input() currentIndex: number = 1;
  @Input() totalItems: number = 1;

  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  isLoading: boolean = true;

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent): void {
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
    if (this.currentIndex > 1) {
      this.isLoading = true;
      this.previous.emit();
    }
  }

  onNext(): void {
    if (this.currentIndex < this.totalItems) {
      this.isLoading = true;
      this.next.emit();
    }
  }

  onClose(): void {
    this.close.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('image-preview-overlay__backdrop')) {
      this.onClose();
    }
  }

  onImageLoad(): void {
    this.isLoading = false;
  }

  onImageError(): void {
    this.isLoading = false;
  }
}
