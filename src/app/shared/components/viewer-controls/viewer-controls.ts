import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { PdfService } from '../../services/pdf.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { EpubService } from '../../services/epub.service';
import { CdkTooltipDirective } from '../../directives';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfigService } from '../../../core/config';
import { TtsService } from '../../services/tts.service';
import { AiPanelService } from '../../services/ai-panel.service';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';

@Component({
  selector: 'app-viewer-controls',
  standalone: true,
  imports: [CommonModule, CdkTooltipDirective, TranslatePipe],
  templateUrl: './viewer-controls.html',
  styleUrl: './viewer-controls.scss'
})
export class ViewerControls {
  @Input() type: 'pdf' | 'image' | 'epub' = 'pdf';
  @Input() showCrop: boolean = true;

  private pdfService = inject(PdfService);
  private iiifViewerService = inject(IIIFViewerService);
  private epubService = inject(EpubService);
  private configService = inject(ConfigService);
  public ttsService = inject(TtsService);
  private aiPanelService = inject(AiPanelService);
  private detailViewService = inject(DetailViewService, { optional: true });
  public iiifBookMode$ = this.iiifViewerService.bookMode$;
  public iiifZoomLock$ = this.iiifViewerService.zoomLock$;
  public pdfBookMode$ = this.pdfService.properties$.pipe(map(p => !!p.bookMode));

  // Viewer control visibility getters
  get showZoomIn(): boolean {
    return this.configService.isViewerControlEnabled('zoomIn');
  }

  get showZoomOut(): boolean {
    return this.configService.isViewerControlEnabled('zoomOut');
  }

  get showFullscreen(): boolean {
    return this.configService.isViewerControlEnabled('fullscreen');
  }

  get showFitToScreen(): boolean {
    return this.configService.isViewerControlEnabled('fitToScreen');
  }

  get showFitToWidth(): boolean {
    return this.configService.isViewerControlEnabled('fitToWidth');
  }

  get showScrollMode(): boolean {
    return this.configService.isViewerControlEnabled('scrollMode');
  }

  get showBookModeButton(): boolean {
    return this.configService.isViewerModeAvailable('book') && this.configService.isViewerControlEnabled('bookMode');
  }

  get showRotate(): boolean {
    return this.configService.isViewerControlEnabled('rotate');
  }

  get showPageText(): boolean {
    return this.configService.isFeatureEnabled('ai');
  }

  onPageText(): void {
    const pid = this.detailViewService?.currentPagePid;
    if (!pid) return;
    this.aiPanelService.showPageText(pid);
  }

  get showSelectArea(): boolean {
    return this.configService.isViewerControlEnabled('selectArea');
  }

  onZoomIn() {
    if (this.type === 'pdf') {
      this.pdfService.zoomIn();
    } else if (this.type === 'epub') {
      this.epubService.zoomIn();
    } else {
      this.iiifViewerService.zoomIn();
    }
  }

  onZoomOut() {
    if (this.type === 'pdf') {
      this.pdfService.zoomOut();
    } else if (this.type === 'epub') {
      this.epubService.zoomOut();
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
    } else if (this.type === 'epub') {
      this.epubService.toggleFullscreen();
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
    } else if (this.type === 'epub') {
      this.epubService.toggleBookMode();
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

  onZoomLock() {
    if (this.type === 'image') {
      this.iiifViewerService.toggleZoomLock();
    }
  }

  onTtsPlayPause() {
    this.ttsService.togglePlayPause();
  }

  onTtsStop() {
    this.ttsService.stop();
  }
}
