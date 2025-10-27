import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-viewer-controls',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './viewer-controls.html',
  styleUrl: './viewer-controls.scss'
})
export class ViewerControls {
  @Input() type: 'pdf' | 'image' = 'pdf';

  // Common events for both viewers
  @Output() zoomIn = new EventEmitter<void>();
  @Output() zoomOut = new EventEmitter<void>();
  @Output() toggleFitToScreen = new EventEmitter<void>();
  @Output() toggleFullscreen = new EventEmitter<void>();
  @Output() rotate = new EventEmitter<void>();

  // PDF-specific events
  @Output() toggleScrollMode = new EventEmitter<void>();
  @Output() toggleGridView = new EventEmitter<void>();
  @Output() toggleTextView = new EventEmitter<void>();
  @Output() bookMode = new EventEmitter<void>();

  // Image-specific events
  @Output() resetView = new EventEmitter<void>();

  onZoomIn() {
    this.zoomIn.emit();
  }

  onZoomOut() {
    this.zoomOut.emit();
  }

  onFitToScreen() {
    this.toggleFitToScreen.emit();
  }

  onFullscreen() {
    this.toggleFullscreen.emit();
  }

  onRotate() {
    this.rotate.emit();
  }

  onScrollMode() {
    this.toggleScrollMode.emit();
  }

  onGridView() {
    this.toggleGridView.emit();
  }

  onTextView() {
    this.toggleTextView.emit();
  }

  onBookMode() {
    this.bookMode.emit();
  }

  onResetView() {
    this.resetView.emit();
  }
}
