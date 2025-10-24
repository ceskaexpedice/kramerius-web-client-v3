import { Component, inject } from '@angular/core';
import { ImageViewerControls } from '../../../../shared/components/image-viewer/image-viewer-controls/image-viewer-controls';
import { ImageViewerService } from '../../../../shared/services/image-viewer.service';

@Component({
  selector: 'app-detail-view-bottom-toolbar',
  imports: [ImageViewerControls, ImageViewerControls],
  templateUrl: './detail-view-bottom-toolbar.component.html',
  styleUrl: './detail-view-bottom-toolbar.component.scss'
})
export class DetailViewBottomToolbarComponent {
  public imageViewerService = inject(ImageViewerService);

  onZoomIn(): void {
    this.imageViewerService.zoomIn();
  }

  onZoomOut(): void {
    this.imageViewerService.zoomOut();
  }

  onRotate(): void {
    this.imageViewerService.toggleRotation();
  }

  onFullscreen(): void {
    this.imageViewerService.toggleFullscreen();
  }

  onFitToScreen(): void {
    this.imageViewerService.fitToScreen();
  }

  onResetView(): void {
    this.imageViewerService.resetView();
  }
}
