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
   * The element-level Fullscreen API entry point for this browser, or null when
   * there is none. iOS exposes no element fullscreen in any browser (they all
   * run WebKit; only <video> has webkitEnterFullscreen), which is why the page
   * stayed unchanged while we showed a close button over it (issue #162).
   *
   * Deliberately feature-detects the request method only. document.fullscreenEnabled
   * is NOT consulted: it is unreliable across mobile browsers and gating on it
   * hid the button on Android, where fullscreen works fine.
   */
  private get requestFullscreenFn(): ((options?: FullscreenOptions) => Promise<void> | void) | null {
    const elem = this.containerRef?.nativeElement as (HTMLElement & Record<string, unknown>) | undefined;
    if (!elem) {
      return null;
    }

    const fn = elem['requestFullscreen'] ?? elem['webkitRequestFullscreen'] ?? elem['msRequestFullscreen'];
    return typeof fn === 'function' ? (fn as () => Promise<void> | void).bind(elem) : null;
  }

  /** True when this browser can put an arbitrary element in fullscreen. */
  public get isFullscreenSupported(): boolean {
    return this.requestFullscreenFn !== null;
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
    const request = this.requestFullscreenFn;
    if (!request) {
      // No element Fullscreen API (notably iOS). Bailing out keeps isFullscreen
      // false, so we never show a close button over an unchanged page.
      return;
    }

    // Native browser fullscreen. Must stay synchronous inside the user gesture.
    const result = request();

    if (result && typeof (result as Promise<void>).catch === 'function') {
      (result as Promise<void>).catch((err: unknown) => {
        // The request can still be refused (gesture expired, permissions
        // policy). Undo the optimistic state so the UI matches what the user
        // actually sees.
        console.error('requestFullscreen rejected', err);
        this.setFullscreenState(false);
      });
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
