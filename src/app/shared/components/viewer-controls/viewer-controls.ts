import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PdfService } from '../../services/pdf.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { CdkTooltipDirective } from '../../directives';
import { TranslatePipe } from '@ngx-translate/core';

@Component({
  selector: 'app-viewer-controls',
  standalone: true,
  imports: [CommonModule, CdkTooltipDirective, TranslatePipe],
  templateUrl: './viewer-controls.html',
  styleUrl: './viewer-controls.scss'
})
export class ViewerControls {
  @Input() type: 'pdf' | 'image' = 'pdf';

  private pdfService = inject(PdfService);
  private iiifViewerService = inject(IIIFViewerService);
  public iiifBookMode$ = this.iiifViewerService.bookMode$;

  onZoomIn() {
    if (this.type === 'pdf') {
      this.pdfService.zoomIn();
    } else {
      this.iiifViewerService.zoomIn();
    }
  }

  onZoomOut() {
    if (this.type === 'pdf') {
      this.pdfService.zoomOut();
    } else {
      this.iiifViewerService.zoomOut();
    }
  }

  onFitToScreen() {
    if (this.type === 'pdf') {
      this.pdfService.fitToScreen();
    } else {
      this.iiifViewerService.fitToScreen();
    }
  }

  onFullscreen() {
    if (this.type === 'pdf') {
      this.pdfService.toggleFullscreen();
    } else {
      this.iiifViewerService.toggleFullscreen();
    }
  }

  onRotate() {
    if (this.type === 'pdf') {
      this.pdfService.toggleRotation();
    } else {
      this.iiifViewerService.toggleRotation();
    }
  }

  onScrollMode() {
    if (this.type === 'pdf') {
      this.pdfService.togglePageViewMode();
    }
  }

  onToggleFitToWidth() {
    if (this.type === 'pdf') {
      this.pdfService.fitToWidth();
    } else {
      this.iiifViewerService.fitToWidth();
    }
  }

  onTextView() {
    if (this.type === 'pdf') {
      this.pdfService.toggleTextLayerMode();
    }
  }

  onBookMode() {
    if (this.type === 'pdf') {
      this.pdfService.bookModeToggle();
    } else if (this.type === 'image') {
      this.iiifViewerService.toggleBookMode();
    }
  }

  onResetView() {
    if (this.type === 'image') {
      this.iiifViewerService.resetView();
    }
  }

  onDrawRectangle() {
    if (this.type === 'image') {
      this.iiifViewerService.addRectangleAtDefaultPosition();
    }
  }

  onSelectArea() {
    if (this.type === 'image') {
      this.iiifViewerService.toggleSelectArea();
    }
  }
}
