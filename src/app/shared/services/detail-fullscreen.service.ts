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

  /**
   * Whether element fullscreen is usable at all. iOS has no element-level
   * Fullscreen API in any browser (they all run WebKit), so offering the
   * control there gives users a button that cannot do anything (issue #162).
   */
  isSupported(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    const el = document.documentElement as HTMLElement & Record<string, unknown>;
    const hasRequestMethod =
      typeof el['requestFullscreen'] === 'function' ||
      typeof el['webkitRequestFullscreen'] === 'function' ||
      typeof el['msRequestFullscreen'] === 'function';

    const doc = document as Document & Record<string, unknown>;
    const enabled = doc.fullscreenEnabled ?? doc['webkitFullscreenEnabled'] ?? true;

    return hasRequestMethod && enabled !== false;
  }
}
