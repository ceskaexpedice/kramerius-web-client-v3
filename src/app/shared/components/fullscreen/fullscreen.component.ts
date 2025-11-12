import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-fullscreen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fullscreen.component.html',
  styleUrl: './fullscreen.component.scss'
})
export class FullscreenComponent implements OnInit, OnDestroy {
  @Output() fullscreenChange = new EventEmitter<boolean>();
  @ViewChild('fullscreenContainer', { static: true }) containerRef!: ElementRef;

  public isFullscreen: boolean = false;
  private fullscreenChangeHandler = this.onFullscreenChange.bind(this);

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
    if (!this.containerRef) {
      return;
    }

    const elem = this.containerRef.nativeElement;

    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.webkitRequestFullscreen) { // Safari
      elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE11
      elem.msRequestFullscreen();
    }

    this.isFullscreen = true;
    this.fullscreenChange.emit(true);
  }

  private exitFullscreen(): void {
    // Check if we're actually in fullscreen before trying to exit
    const isInFullscreen = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).msFullscreenElement
    );

    if (!isInFullscreen) {
      this.isFullscreen = false;
      return;
    }

    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) { // Safari
      (document as any).webkitExitFullscreen();
    } else if ((document as any).msExitFullscreen) { // IE11
      (document as any).msExitFullscreen();
    }

    this.isFullscreen = false;
    this.fullscreenChange.emit(false);
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
      this.isFullscreen = false;
      this.fullscreenChange.emit(false);
    }
  }

  onClose(): void {
    this.toggle();
  }
}
