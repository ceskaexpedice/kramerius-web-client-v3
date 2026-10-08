import { Component, DestroyRef, HostListener, Input, NgZone, OnInit, inject, signal } from '@angular/core';
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
import { AccessibilityService } from '../../services/accessibility.service';

@Component({
  selector: 'app-viewer-controls',
  standalone: true,
  imports: [CommonModule, CdkTooltipDirective, TranslatePipe, SliderComponent],
  templateUrl: './viewer-controls.html',
  styleUrl: './viewer-controls.scss'
})
export class ViewerControls implements OnInit {
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
  private accessibility = inject(AccessibilityService);
  private zone = inject(NgZone);
  private destroyRef = inject(DestroyRef);
  public iiifBookMode$ = this.iiifViewerService.bookMode$;
  public iiifZoomLock$ = this.iiifViewerService.zoomLock$;
  public iiifMapMode$ = this.iiifViewerService.mapMode$;
  public pdfBookMode$ = this.pdfService.properties$.pipe(map(p => !!p.bookMode));

  /** Background-removal strength for the georeferenced map layer (0..100). */
  backgroundRemovalPercent = 0;

  /**
   * The column floats over the page it serves, and at the left edge it cuts
   * across several lines of text at once when the reader zooms in (issue
   * #185). It now fades out once the reader stops moving the pointer and
   * comes back the moment they move again, so the scan is unobstructed while
   * it is being read and the tools are there whenever a hand reaches for
   * them. Every tool stays in the column: an earlier attempt folded the less
   * common ones behind a toggle, which buried the page-text button that
   * readers depend on when a document has no ALTO layer.
   */
  private static readonly IDLE_DELAY_MS = 4000;

  /** See idleDelay(): waking by tap is more deliberate than a mouse twitch. */
  private static readonly TOUCH_IDLE_DELAY_MS = 6000;

  /** Faded out because the pointer has been still; see IDLE_DELAY_MS. */
  readonly idle = signal(false);

  /**
   * Suppresses the fade while the pointer is over the column itself, so it
   * cannot vanish from under a reader who is aiming at a button.
   */
  private pointerInside = false;

  private idleTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Touch fades the column too -- a tablet is exactly where the column covers
   * the most of the page, so exempting touch would skip the readers who need
   * it most. What differs is the wake gesture: there is no pointer to move,
   * so any touch on the page brings it back. That is safe only because the
   * faded column sets `pointer-events: none`, which lets the waking tap pass
   * through to the scan instead of firing whichever button sat under the
   * finger -- the failure mode raised in review of the first attempt.
   *
   * Re-read per interaction rather than cached, since a hybrid laptop can
   * gain and lose a mouse mid-session.
   */
  private get isTouchOnly(): boolean {
    return typeof window !== 'undefined'
      && !!window.matchMedia?.('(hover: none), (pointer: coarse)').matches;
  }

  /**
   * Readers who asked for less motion, through the app's own setting or the
   * OS, keep a column that never moves on its own.
   */
  private get prefersReducedMotion(): boolean {
    return this.accessibility.settings().reduceMotion
      || (typeof window !== 'undefined'
        && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  }

  private get autoHideEnabled(): boolean {
    return !this.mobileMenuMode && !this.prefersReducedMotion;
  }

  /**
   * Touch gets longer to react. Waking with a mouse costs a twitch, so a
   * short delay there is cheap; on touch it costs a deliberate tap, and the
   * reader has usually just finished panning the scan into place when the
   * timer starts.
   */
  private get idleDelay(): number {
    return this.isTouchOnly
      ? ViewerControls.TOUCH_IDLE_DELAY_MS
      : ViewerControls.IDLE_DELAY_MS;
  }

  ngOnInit(): void {
    if (!this.mobileMenuMode) {
      this.scheduleIdle();
    }
    this.destroyRef.onDestroy(() => this.clearIdleTimer());
  }

  /**
   * Pointer movement anywhere in the document wakes the column. It is bound
   * on the document rather than the viewer because the column is a sibling
   * of the viewer, not a child, in all three host pages -- and a reader
   * moving toward it from the toolbar should find it already visible.
   *
   * Runs outside Angular: mousemove fires continuously, and waking an
   * already-visible column must not cost a change-detection pass per event.
   */
  @HostListener('document:mousemove')
  @HostListener('document:wheel')
  onPointerActivity(): void {
    if (!this.autoHideEnabled) return;
    if (this.idle()) {
      this.zone.run(() => this.idle.set(false));
    }
    this.scheduleIdle();
  }

  /** Keyboard users wake it too, so Tab never lands on a faded control. */
  @HostListener('document:keydown')
  onKeyboardActivity(): void {
    this.onPointerActivity();
  }

  /**
   * Touch wake. A finger going down anywhere brings the column back and
   * holds it there for as long as the gesture lasts -- a reader panning or
   * pinching the scan is working, and the column must not fade out from
   * under the gesture that just summoned it.
   *
   * `touchstart` rather than a synthesised click, so the column is already
   * on screen by the time the finger lifts.
   */
  @HostListener('document:touchstart')
  onTouchStart(): void {
    if (!this.autoHideEnabled) return;
    this.clearIdleTimer();
    if (this.idle()) {
      this.zone.run(() => this.idle.set(false));
    }
  }

  /** The gesture is over, so the column may start counting down again. */
  @HostListener('document:touchend')
  @HostListener('document:touchcancel')
  onTouchEnd(): void {
    this.scheduleIdle();
  }

  /**
   * Holding the column open under a resting pointer is a mouse affordance.
   * On touch it is skipped deliberately: tapping a button emits a synthetic
   * mouseenter with no mouseleave to answer it when the finger moves away,
   * which would pin the column open for good. There, touchend restarts the
   * countdown instead.
   */
  @HostListener('mouseenter')
  onPointerEnter(): void {
    if (this.isTouchOnly) return;
    this.pointerInside = true;
    this.clearIdleTimer();
    if (this.idle()) {
      this.idle.set(false);
    }
  }

  @HostListener('mouseleave')
  onPointerLeave(): void {
    this.pointerInside = false;
    this.scheduleIdle();
  }

  /**
   * Focus moving into the column pins it open for assistive tech and
   * keyboard users, who have no pointer to hold it there. Unlike hover this
   * applies on touch as well -- focusout always answers focusin, so the flag
   * cannot be left stuck the way a synthetic mouseenter would leave it.
   */
  @HostListener('focusin')
  onFocusIn(): void {
    this.pointerInside = true;
    this.clearIdleTimer();
    if (this.idle()) {
      this.idle.set(false);
    }
  }

  @HostListener('focusout')
  onFocusOut(): void {
    this.onPointerLeave();
  }

  private scheduleIdle(): void {
    this.clearIdleTimer();
    if (!this.autoHideEnabled || this.pointerInside) return;
    this.zone.runOutsideAngular(() => {
      this.idleTimer = setTimeout(() => {
        this.zone.run(() => this.idle.set(true));
      }, this.idleDelay);
    });
  }

  private clearIdleTimer(): void {
    if (this.idleTimer !== null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

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

  /**
   * Whether to offer the page-text transcript button.
   *
   * Scanned pages only. The panel this opens reads the page's ALTO XML, which is
   * produced by OCR over a scan -- a PDF already carries its own text layer that
   * the reader can select and search in place, so the button adds nothing there.
   *
   * PAGE SCOPE, gated on `text`. The panel renders the page's full transcript, so
   * a licence that denies `text` must not have the button at all --
   * `AiContentPanelComponent` only blocks *copying* out of the panel, which does
   * nothing once the whole transcript is already on screen.
   *
   * `isActionAllowed` resolves through `providedByLicenses` when the backend sent
   * them, so this follows the licence the page is actually being served under
   * rather than the Solr flag: a `dnnto` page served as `public` keeps its
   * transcript, and a page served as `dnnto` loses it even on an otherwise open
   * document.
   *
   * Falls open when `DetailViewService` is absent (it is injected `optional`), so
   * viewers outside the detail view behave as before.
   */
  get showPageText(): boolean {
    return this.type !== 'pdf'
      && this.configService.isFeatureEnabled('ai')
      && (this.detailViewService?.isActionAllowed('text') ?? true);
  }

  onPageText(): void {
    if (!this.showPageText) return;
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
      items.push({ id: 'fit-to-width', icon: 'icon-pharagraphspacing icon-rotate-90', tooltip: 'viewer-controls.fit-to-width' });
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

    // Read-aloud controls. The floating layout renders these as their own
    // buttons, but on compact viewports the whole column collapses into this
    // menu — without them there is no way to stop reading (issue #161).
    if (this.ttsService.isReading()) {
      const blocked = this.ttsService.playbackBlocked();
      const paused = this.ttsService.isPaused();
      items.push({
        id: 'tts-play-pause',
        icon: paused ? 'icon-play' : 'icon-pause',
        tooltip: blocked ? 'ai.tts-blocked' : paused ? 'ai.tts-resume' : 'ai.tts-pause',
        dividerAbove: true,
      });
      items.push({ id: 'tts-stop', icon: 'icon-stop', tooltip: 'ai.tts-stop' });
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
      case 'tts-play-pause':
        this.onTtsPlayPause();
        break;
      case 'tts-stop':
        this.onTtsStop();
        break;
    }
  }

}
