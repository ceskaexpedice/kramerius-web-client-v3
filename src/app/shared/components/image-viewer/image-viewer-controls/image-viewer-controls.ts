import { Component, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-image-viewer-controls',
  imports: [],
  templateUrl: './image-viewer-controls.html',
  styleUrl: './image-viewer-controls.scss'
})
export class ImageViewerControls {
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() toggleFitToScreen = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() rotate = new EventEmitter<void>();
  @Output() resetView = new EventEmitter<void>();

  onZoomIn() {
    this.zoomIn.emit();
  }

  onZoomOut() {
    this.zoomOut.emit();
  }

  onFullscreen() {
    this.toggleFullscreen.emit();
  }

  onRotate() {
    this.rotate.emit();
  }

  onFitToScreen() {
    this.toggleFitToScreen.emit();
  }

  onResetView() {
    this.resetView.emit();
  }
}
