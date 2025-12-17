import { Component, inject } from '@angular/core';
import { ViewerControls } from '../../../../shared/components/viewer-controls/viewer-controls';
import { IIIFViewerService } from '../../../../shared/services/iiif-viewer.service';

@Component({
  selector: 'app-detail-view-bottom-toolbar',
  imports: [ViewerControls],
  templateUrl: './detail-view-bottom-toolbar.component.html',
  styleUrl: './detail-view-bottom-toolbar.component.scss'
})
export class DetailViewBottomToolbarComponent {
  public imageViewerService = inject(IIIFViewerService);

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

  onFitToWidth(): void {
    this.imageViewerService.fitToWidth();
  }

  onResetView(): void {
    this.imageViewerService.resetView();
  }
}
