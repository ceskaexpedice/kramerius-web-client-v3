import {Component, EventEmitter, Output} from '@angular/core';

@Component({
  selector: 'app-pdf-viewer-controls',
  imports: [],
  templateUrl: './pdf-viewer-controls.html',
  styleUrl: './pdf-viewer-controls.scss'
})
export class PdfViewerControls {
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() toggleFitToScreen = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() toggleScrollMode = new EventEmitter<void>();
  @Output() toggleGridView = new EventEmitter<void>();
  @Output() toggleTextView = new EventEmitter<void>();
  @Output() rotate = new EventEmitter<void>();
  @Output() bookMode = new EventEmitter<void>();

  onZoomIn() {
    this.zoomIn.emit();
  }

  onZoomOut() {
    this.zoomOut.emit();
  }

  onFullscreen() {
    this.toggleFullscreen.emit();
  }

  onScrollMode() {
    this.toggleScrollMode.emit();
  }

  onGridView() {
    this.toggleGridView.emit();
  }

  onRotate() {
    this.rotate.emit();
  }

  onTextView() {
    this.toggleTextView.emit();
  }

  onBookMode() {
    this.bookMode.emit();
  }

  onFitToScreen() {
    this.toggleFitToScreen.emit();
  }
}
