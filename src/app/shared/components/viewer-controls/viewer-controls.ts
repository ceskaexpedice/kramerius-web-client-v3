import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { map } from 'rxjs/operators';
import { PdfService } from '../../services/pdf.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { EpubService } from '../../services/epub.service';
import { CdkTooltipDirective } from '../../directives';
import { TranslatePipe } from '@ngx-translate/core';
import { ConfigService } from '../../../core/config';
import { AiPanelService } from '../../services/ai-panel.service';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { MapViewerService } from '../../services/map-viewer.service';
import { TtsService } from '../../services/tts.service';
import { SliderComponent } from '../slider/slider.component';
import { ToolbarAction } from '../toolbar-controls/toolbar-controls.component';

@Component({
  selector: 'app-viewer-controls',
  standalone: true,
  imports: [CommonModule, CdkTooltipDirective, TranslatePipe, SliderComponent],
  templateUrl: './viewer-controls.html',
  styleUrl: './viewer-controls.scss'
})
export class ViewerControls {
  @Input() type: 'pdf' | 'image' | 'epub' = 'pdf';
  @Input() showCrop: boolean = true;
  /** When true, the component renders no floating UI; its actions are surfaced via getMenuItems()/handleMenuAction() for the mobile toolbar menu. */
  @Input() mobileMenuMode = false;

  private pdfService = inject(PdfService);
  private iiifViewerService = inject(IIIFViewerService);
  private epubService = inject(EpubService);
  private configService = inject(ConfigService);
  public aiPanelService = inject(AiPanelService);
  public ttsService = inject(TtsService);
  private detailViewService = inject(DetailViewService, { optional: true });
  private mapViewerService = inject(MapViewerService, { optional: true });
  public iiifBookMode$ = this.iiifViewerService.bookMode$;
  public iiifZoomLock$ = this.iiifViewerService.zoomLock$;
  public iiifMapMode$ = this.iiifViewerService.mapMode$;
  public pdfBookMode$ = this.pdfService.properties$.pipe(map(p => !!p.bookMode));

  /** Background-removal strength for the georeferenced map layer (0..100). */
  backgroundRemovalPercent = 0;

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

  private get isMapMode(): boolean {
    return this.type === 'image' && this.iiifViewerService.isMapMode();
  }

  onZoomIn() {
    if (this.type === 'pdf') {
      this.pdfService.zoomIn();
    } else if (this.type === 'epub') {
      this.epubService.zoomIn();
    } else if (this.isMapMode) {
      this.mapViewerService?.zoomIn();
    } else {
      this.iiifViewerService.zoomIn();
    }
  }

  onZoomOut() {
    if (this.type === 'pdf') {
      this.pdfService.zoomOut();
    } else if (this.type === 'epub') {
      this.epubService.zoomOut();
    } else if (this.isMapMode) {
      this.mapViewerService?.zoomOut();
    } else {
      this.iiifViewerService.zoomOut();
    }
  }

  onFitToScreen() {
    if (this.type === 'pdf') {
      this.pdfService.fitToScreen();
    } else if (this.isMapMode) {
      this.mapViewerService?.fitToScreen();
    } else {
      this.iiifViewerService.fitToScreen();
    }
  }

  onFullscreen() {
    if (this.type === 'pdf') {
      this.pdfService.toggleFullscreen();
    } else if (this.type === 'epub') {
      this.epubService.toggleFullscreen();
    } else if (this.isMapMode) {
      this.mapViewerService?.toggleFullscreen();
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

  onTtsPlayPause(): void {
    this.ttsService.togglePlayPause();
  }

  onTtsStop(): void {
    this.ttsService.stop();
  }

  onBackgroundRemovalChange(percent: number): void {
    this.backgroundRemovalPercent = percent;
    this.mapViewerService?.setBackgroundRemoval({
      enabled: percent > 0,
      threshold: percent / 100
    });
  }

  /**
   * Viewer actions for the mobile toolbar "more" menu. Mirrors the visibility
   * rules of the floating template but excludes zoom in/out (users pinch-zoom on
   * touch). Returned as ToolbarAction[] so they merge into app-toolbar-controls;
   * `tooltip` holds the translation key used as the menu label.
   */
  getMenuItems(): ToolbarAction[] {
    const items: ToolbarAction[] = [];
    const isImage = this.type === 'image';
    const isPdf = this.type === 'pdf';
    const mapMode = this.iiifViewerService.isMapMode();
    const imageInterior = isImage && !mapMode;
    const notImageInMap = !isImage || !mapMode;

    if (imageInterior && this.showCrop && this.showSelectArea && !this.iiifViewerService.isBookMode()) {
      items.push({ id: 'select-area', icon: 'icon-crop', tooltip: 'viewer-controls.select-area' });
    }

    if (this.showFullscreen) {
      items.push({ id: 'fullscreen', icon: 'icon-maximize-3', tooltip: 'viewer-controls.fullscreen' });
    }

    if (this.showFitToScreen) {
      items.push({ id: 'fit-to-screen', icon: 'icon-pharagraphspacing', tooltip: 'viewer-controls.fit-to-screen' });
    }

    const pdfBookMode = isPdf ? !!this.pdfService.pdfProperties.bookMode : this.iiifViewerService.isBookMode();
    if (this.showFitToWidth && !pdfBookMode && notImageInMap) {
      items.push({ id: 'fit-to-width', icon: 'icon-grid-lock', tooltip: 'viewer-controls.fit-to-width' });
    }

    if (imageInterior) {
      items.push({ id: 'zoom-lock', icon: 'icon-maximize-lock', tooltip: 'viewer-controls.zoom-lock' });
    }

    if (isPdf && this.showScrollMode) {
      items.push({ id: 'scroll-mode', icon: 'icon-pharagraphspacing', tooltip: 'viewer-controls.toggle-scroll-mode' });
    }

    if (this.showRotate && notImageInMap) {
      items.push({ id: 'rotate', icon: 'icon-rotate-right1', tooltip: 'viewer-controls.rotate' });
    }

    if (this.showPageText && notImageInMap) {
      items.push({ id: 'page-text', icon: 'icon-text', tooltip: 'viewer-controls.page-text' });
    }

    if (this.showBookModeButton && notImageInMap) {
      items.push({ id: 'book-mode', icon: 'icon-book-1', tooltip: 'viewer-controls.book-mode' });
    }

    return items;
  }

  /** Routes a menu item id (from getMenuItems) to the matching viewer action. */
  handleMenuAction(id: string): void {
    switch (id) {
      case 'select-area':
        this.onSelectArea();
        break;
      case 'fullscreen':
        this.onFullscreen();
        break;
      case 'fit-to-screen':
        this.onFitToScreen();
        break;
      case 'fit-to-width':
        this.onToggleFitToWidth();
        break;
      case 'zoom-lock':
        this.onZoomLock();
        break;
      case 'scroll-mode':
        this.onScrollMode();
        break;
      case 'rotate':
        this.onRotate();
        break;
      case 'page-text':
        this.onPageText();
        break;
      case 'book-mode':
        this.onBookMode();
        break;
    }
  }

}
