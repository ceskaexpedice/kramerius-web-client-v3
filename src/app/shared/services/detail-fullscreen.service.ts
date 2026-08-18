import { Injectable, signal } from '@angular/core';

/**
 * Coordinates a single shared fullscreen container for the detail view so the
 * IIIF viewer, viewer-controls, and AI content panel all share one fullscreen
 * element. Individual viewers/panels no longer fullscreen their own subtree;
 * they call toggle() here, which fullscreens the common content body.
 */
@Injectable({ providedIn: 'root' })
export class DetailFullscreenService {
  readonly isFullscreen = signal(false);

  private toggleFn: (() => void) | null = null;

  registerToggle(fn: (() => void) | null): void {
    this.toggleFn = fn;
  }

  setFullscreen(value: boolean): void {
    this.isFullscreen.set(value);
  }

  toggle(): void {
    this.toggleFn?.();
  }
}
