import { Component, Input, Output, EventEmitter, signal, OnChanges, SimpleChanges } from '@angular/core';
import { NgClass, NgIf } from '@angular/common';

export type ThumbnailSize = 'sm' | 'md' | 'lg' | 'auto';
export type FallbackIcon = 'gallery' | 'music' | 'document' | 'user';

@Component({
  selector: 'app-thumbnail-image',
  standalone: true,
  imports: [NgClass, NgIf],
  templateUrl: './thumbnail-image.component.html',
  styleUrl: './thumbnail-image.component.scss'
})
export class ThumbnailImageComponent implements OnChanges {
  /** Image source URL */
  @Input() src: string | null = null;

  /** Alt text for the image */
  @Input() alt = '';

  /** Size preset for the thumbnail */
  @Input() size: ThumbnailSize = 'auto';

  /** Icon to show as fallback when image fails to load */
  @Input() fallbackIcon: FallbackIcon = 'gallery';

  /** Custom CSS class for the container */
  @Input() containerClass = '';

  /** Whether to use lazy loading */
  @Input() lazy = true;

  /** Show skeleton while loading */
  @Input() showSkeleton = true;

  /** Emits when image loads successfully */
  @Output() loaded = new EventEmitter<void>();

  /** Emits when image fails to load */
  @Output() error = new EventEmitter<void>();

  /** Internal state signals */
  imageLoaded = signal<boolean>(false);
  imageError = signal<boolean>(false);

  ngOnChanges(changes: SimpleChanges): void {
    // Reset state when src changes
    if (changes['src']) {
      const prev = changes['src'].previousValue;
      const curr = changes['src'].currentValue;

      if (curr !== prev) {
        this.imageLoaded.set(false);
        this.imageError.set(false);
      }
    }
  }

  onImageLoad(): void {
    this.imageLoaded.set(true);
    this.imageError.set(false);
    this.loaded.emit();
  }

  onImageError(): void {
    this.imageLoaded.set(true);
    this.imageError.set(true);
    this.error.emit();
  }

  get fallbackIconClass(): string {
    const iconMap: Record<FallbackIcon, string> = {
      'gallery': 'icon-gallery',
      'music': 'icon-music-filter',
      'document': 'icon-document',
      'user': 'icon-user'
    };
    return iconMap[this.fallbackIcon] || 'icon-gallery';
  }

  get isLoading(): boolean {
    return !this.imageLoaded() && !this.imageError() && !!this.src;
  }

  get showFallback(): boolean {
    return this.imageError() || !this.src;
  }
}
