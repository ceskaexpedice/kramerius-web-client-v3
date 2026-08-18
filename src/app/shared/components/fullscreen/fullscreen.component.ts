import { Component, ElementRef, EventEmitter, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './fullscreen.component.html',
  styleUrl: './fullscreen.component.scss'
})
export class FullscreenComponent implements OnInit, OnDestroy {
  @Input() showCloseButton: boolean = true;
  @Output() fullscreenChange = new EventEmitter<boolean>();
  @ViewChild('fullscreenContainer', { static: true }) containerRef!: ElementRef;

  public isFullscreen: boolean = false;
  private fullscreenChangeHandler = this.onFullscreenChange.bind(this);

  /**
   * Whether this browser can actually put an arbitrary element in fullscreen.
   * iOS (all browsers, including Chrome — they are all WebKit under the hood)
   * exposes no element-level Fullscreen API: only <video> has
   * webkitEnterFullscreen. Without this guard we flipped state optimistically
   * and rendered a close button over an unchanged page (issue #162).
   */
  public get isFullscreenSupported(): boolean {
    if (typeof document === 'undefined') {
      return false;
    }

    const elem = this.containerRef?.nativeElement as (HTMLElement & Record<string, unknown>) | undefined;
    const hasRequestMethod = !!elem && (
      typeof elem['requestFullscreen'] === 'function' ||
      typeof elem['webkitRequestFullscreen'] === 'function' ||
      typeof elem['msRequestFullscreen'] === 'function'
    );

    // fullscreenEnabled is false when a permissions policy blocks it (e.g. an
    // iframe without allow="fullscreen"), even where the methods exist.
    const doc = document as Document & Record<string, unknown>;
    const enabled = doc.fullscreenEnabled ?? doc['webkitFullscreenEnabled'] ?? true;

    return hasRequestMethod && enabled !== false;
  }

  ngOnInit(): void {
    // Listen for fullscreen change events (user pressing ESC, F11, etc.)
    document.addEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.addEventListener('MSFullscreenChange', this.fullscreenChangeHandler);
  }

  ngOnDestroy(): void {
    // Clean up event listeners
    document.removeEventListener('fullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('webkitfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('mozfullscreenchange', this.fullscreenChangeHandler);
    document.removeEventListener('MSFullscreenChange', this.fullscreenChangeHandler);

    // Exit fullscreen if still active
    if (this.isFullscreen) {
      this.exitFullscreen();
    }
  }

  /**
   * Public method to toggle fullscreen.
   * MUST be called synchronously within a user gesture (e.g., click event).
   */
  public toggle(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    if (!this.containerRef || !this.isFullscreenSupported) {
      // Nothing to do on browsers without element fullscreen (notably iOS).
      // Bailing out keeps isFullscreen false, so no close button is shown over
      // a page whose layout never changed.
      return;
    }

    const elem = this.containerRef.nativeElement;

    if (elem.requestFullscreen) {
      const result = elem.requestFullscreen();
      if (result && typeof result.catch === 'function') {
        result.catch((err: unknown) => {
          // The request can still be refused (gesture expired, policy). Undo the
          // optimistic state so the UI matches what the user actually sees.
          console.error('requestFullscreen rejected', err);
          this.setFullscreenState(false);
        });
      }
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }

    this.setFullscreenState(true);
  }

  /** Updates local state and notifies the host only on an actual change. */
  private setFullscreenState(value: boolean): void {
    if (this.isFullscreen === value) {
      return;
    }

    this.isFullscreen = value;
    this.fullscreenChange.emit(value);
  }

  private exitFullscreen(): void {
    // Check if we're actually in fullscreen before trying to exit
    const isInFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isInFullscreen) {
      // Emit as well as reset: the host mirrors this state, so a silent reset
      // would leave it stuck reporting fullscreen.
      this.setFullscreenState(false);
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { // Safari
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { // IE11
      (document as any).msExitFullscreen();
    }

    this.setFullscreenState(false);
  }

  private onFullscreenChange(): void {
    const isCurrentlyFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );

    // If user exited fullscreen (e.g., pressed ESC), update state and emit event
    if (!isCurrentlyFullscreen && this.isFullscreen) {
      this.setFullscreenState(false);
    }
  }

  onClose(): void {
    this.toggle();
  }
}
