import {
  Component,
  inject,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ElementRef,
  ViewChild,
  AfterViewInit,
  NgZone,
  ChangeDetectorRef,
  signal,
  computed,
  effect,
  viewChild,
  HostListener
} from '@angular/core';
import { Metadata } from '../../models/metadata.model';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { Subject, Subscription, switchMap, EMPTY, catchError, skip, distinctUntilChanged, Observable, of } from 'rxjs';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import OpenSeadragon from 'openseadragon';
import { SelectionControls } from '../selection-controls/selection-controls';
import { CommonModule } from '@angular/common';
import { ViewerWatermarkComponent } from '../viewer-watermark/viewer-watermark.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs/operators';
import { RecordHandlerService } from '../../services/record-handler.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ExportService } from '../../services/export.service';
import { AltoService } from '../../services/alto.service';
import { TtsService } from '../../services/tts.service';
import { AiPanelService } from '../../services/ai-panel.service';
import { ThumbnailImageComponent } from '../thumbnail-image/thumbnail-image.component';
import { HttpClient, HttpContext, HttpHeaders } from '@angular/common/http';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { SKIP_ERROR_INTERCEPTOR } from '../../../core/services/http-context-tokens';
import { Store } from '@ngrx/store';
import { AuthService } from '../../../core/auth/auth.service';
import { selectDocumentDetail } from '../../state/document-detail/document-detail.selectors';
import { CdkSourceService } from '../../services/cdk-source.service';
import { UserService } from '../../services/user.service';
import { ConfigService } from '../../../core/config/config.service';
import { InfoBannerAction, InfoBannerComponent } from '../info-banner/info-banner.component';
import { alternativeSources, FallbackReason, fallbackNoticeText } from './iiif-fallback-notice';

/** Tile edge OpenSeadragon requests from the IIIF server; see enlargeTiles. */
const IIIF_TILE_SIZE = 512;

@Component({
  selector: 'app-iiif-viewer',
  imports: [
    SelectionControls,
    CommonModule,
    ThumbnailImageComponent,
    ViewerWatermarkComponent,
    InfoBannerComponent,
    TranslatePipe
  ],
  templateUrl: './iiif-viewer.html',
  styleUrl: './iiif-viewer.scss'
})
export class IIIFViewer implements OnInit, OnDestroy, OnChanges, AfterViewInit {

  @Input() metadata: Metadata | null = null;
  @Input() imagePid: string | null = null;
  /**
   * The page's access check is still running: keep showing the current page and
   * load `imagePid` only once this turns false, so a page the reader may not see
   * never shows (not even its thumbnail).
   */
  @Input() holdPage = false;
  private heldInit = false;
  private heldPageChange = false;

  @ViewChild('viewerContainer', { static: false }) viewerContainer!: ElementRef;

  public iiifViewerService = inject(IIIFViewerService);
  private detailViewService = inject(DetailViewService);
  private recordHandlerService = inject(RecordHandlerService);
  private exportService = inject(ExportService);
  private altoService = inject(AltoService);
  private aiPanelService = inject(AiPanelService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);
  private ttsService = inject(TtsService);
  private store = inject(Store);
  private cdkSource = inject(CdkSourceService);
  private userService = inject(UserService);
  private configService = inject(ConfigService);
  private translate = inject(TranslateService);

  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);
  private subscriptions: Subscription[] = [];

  private viewer: OpenSeadragon.Viewer | null = null;
  /** Detaches the handlers set up by watchThumbnailPlaceholder, if any are attached. */
  private stopThumbnailWatch: (() => void) | null = null;
  /**
   * Exposed to the template so the watermark overlay can bind to the live
   * viewer: it draws in image coordinates and needs the viewport to project
   * them onto the screen.
   */
  public readonly osdViewer = signal<OpenSeadragon.Viewer | null>(null);
  private updateViewer$ = new Subject<void>();
  private failedPids = new Set<string>();
  private directImageFailedPids = new Set<string>();

  public showFallback = signal<boolean>(false);
  public fallbackImageUrl = signal<string | null>(null);

  /**
   * The thumbnail currently painted as the container's background placeholder.
   *
   * Handed to the watermark overlay so it can stamp that placeholder too: the
   * tiled image does not exist until `info.json` returns, and without this the
   * page would be on screen unwatermarked for that whole round-trip.
   */
  public readonly placeholderUrl = signal<string | null>(null);

  /**
   * Object URL of the direct-image fallback currently held by OpenSeadragon.
   * ImageTileSource loads via a plain `new Image()`, which cannot carry an
   * Authorization header, so licensed images are fetched as a blob instead
   * (see loadDirectImageFallback). The URL must be revoked once it is no
   * longer displayed or the blob leaks for the lifetime of the document.
   */
  private fallbackObjectUrl: string | null = null;

  /**
   * Set when the direct image came back 403 — the image exists but the current
   * user has no right to it (e.g. a `dnnto` page while logged out or without
   * the licence). Distinguishes "not allowed" from "failed to load".
   */
  public accessDenied = signal<boolean>(false);

  /**
   * Why only the thumbnail is on screen, shown as a notice above the viewer.
   *
   * Unlike showFallback it survives a page change: when a member library is
   * down every page fails, and resetting it per page would flash the notice on
   * and off while paging. It clears once a page really opens, on retry, and
   * when the reader switches source.
   */
  public fallbackNotice = signal<FallbackReason | null>(null);

  /**
   * The reader closed the notice. On a phone it takes a good part of the
   * screen, so once dismissed it stays hidden while paging through the same
   * failing library, until a page opens or the source changes.
   */
  public fallbackNoticeDismissed = signal(false);

  private readonly fallbackNoticeEl = viewChild('fallbackNoticeEl', { read: ElementRef });

  /** Publishes the notice's height so the floating viewer controls can clear it. */
  private readonly trackFallbackNoticeHeight = effect(onCleanup => {
    const el = this.fallbackNoticeEl()?.nativeElement as HTMLElement | undefined;
    if (!el) {
      this.iiifViewerService.fallbackNoticeHeight.set(0);
      return;
    }
    const observer = new ResizeObserver(() => this.iiifViewerService.fallbackNoticeHeight.set(el.offsetHeight));
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  /** Member libraries of the open document - the options of the "Source" selector. */
  private readonly documentCollections = toSignal(
    this.store.select(selectDocumentDetail).pipe(map(doc => doc?.cdkCollections ?? [])),
    { initialValue: [] as string[] }
  );

  /** Current language, read by the notice computeds so they re-translate on a switch. */
  private readonly lang = toSignal(
    this.translate.onLangChange.pipe(map(e => e.lang)),
    { initialValue: this.translate.getCurrentLang() }
  );

  readonly fallbackNoticeContent = computed(() => {
    const reason = this.fallbackNotice();
    if (!reason || this.fallbackNoticeDismissed()) return null;
    this.lang();
    const current = this.cdkSource.codeSignal();
    const text = fallbackNoticeText(
      reason,
      current,
      alternativeSources(this.documentCollections(), current),
      code => this.translate.instant(code),
    );
    const actions: InfoBannerAction[] = [];
    if (reason === 'unavailable') {
      actions.push({ id: 'retry', label: this.translate.instant('iiif-fallback--retry'), icon: 'icon-refresh', style: 'outlined light' });
    } else if (!this.userService.isLoggedIn && this.configService.isLoginEnabled()) {
      actions.push({ id: 'login', label: this.translate.instant('login'), icon: 'icon-login', style: 'outlined light' });
    }
    return {
      icon: reason === 'forbidden' ? 'icon-lock-1' : 'icon-gallery-slash',
      title: this.translate.instant(text.titleKey, text.titleParams),
      message: this.translate.instant(text.messageKey, text.messageParams),
      actions,
    };
  });

  readonly docLicenses = toSignal(
    this.detailViewService.document$.pipe(map(doc => doc?.licences ?? [])),
    { initialValue: [] as string[] }
  );

  public selectionRect: { top: number, left: number } | null = null;
  public showSelectionControls = false;
  /** Kept across selections: once the reader collapses the toolbar it stays collapsed. */
  public selectionControlsCollapsed = false;
  /**
   * Set once the reader drags the toolbar. From then on it stays where they put
   * it (only clamped to the viewer) instead of tracking the selection's edge,
   * so it can be moved off text it would otherwise cover. Reset with the selection.
   */
  private selectionControlsPinned = false;

  // Swipe detection configuration. A swipe turns the page only from a page
  // edge the reader can already see (see visiblePageEdges), so with the page
  // zoomed in a drag pans it and only a drag past its edge turns the page.
  // There is no time limit: a slow, long drag counts as much as a quick flick.
  private readonly SWIPE_CONFIG = {
    minDistanceRatio: 0.25, // A slow drag must cover this share of the viewer width
    flickDistance: 50,      // A quick flick needs only this many px...
    flickVelocity: 0.3,     // ...at this speed (px/ms)
    maxVerticalRatio: 0.5,  // Max vertical/horizontal ratio (prevents diagonal swipes)
    edgeTolerance: 0.01     // Share of the view width a page edge may sit outside it
  } as const;

  // Touch tracking state for the gesture in progress (first finger down to
  // last finger up).
  private touchState = {
    startX: 0,
    startY: 0,
    startTime: 0,
    tracking: false,
    // Most fingers down at once during the gesture: a pinch is never a swipe,
    // not even its one-finger tail after the other finger lifts.
    maxTouches: 0,
    // Page edges visible when the gesture started.
    edges: { left: false, right: false }
  };

  private readonly TEST_FALLBACK = false;

  constructor() {
    // Watch TTS state and show/clear highlight overlay on matching page
    effect(() => {
      const currentBlock = this.ttsService.currentBlock();
      const ttsPagePid = this.ttsService.currentPagePid();
      const isReading = this.ttsService.isReading();

      if (isReading && currentBlock && ttsPagePid === this.imagePid) {
        this.iiifViewerService.showTtsHighlight(currentBlock);
      } else {
        this.iiifViewerService.clearTtsHighlight();
      }
    });
  }

  private resizeObserver: ResizeObserver | null = null;
  /** Debounce for re-fitting the page after the container stops resizing. */
  private resizeSettle: ReturnType<typeof setTimeout> | null = null;
  /**
   * Whether the page sits at its fitted ("home") view, so a layout change should
   * re-fit it. Cleared when the reader zooms, or a shared crop zooms for them.
   */
  private atHome = true;

  ngOnInit(): void {
    this.iiifViewerService.uuid = this.metadata?.uuid || null;

    // Wire up viewer update pipeline with switchMap so rapid navigation cancels in-flight requests
    this.subscriptions.push(
      this.updateViewer$.pipe(
        switchMap(() => this.buildViewerUpdate().pipe(
          catchError((error) => {
            console.error('Failed to fetch IIIF info.json for page update', error);
            this.handleOpenFailed();
            return EMPTY;
          })
        ))
      ).subscribe()
    );

    // Subscribe to book mode changes. bookMode$ is a BehaviorSubject, so it
    // replays its seed on subscribe; skip(1) ignores that replay because the
    // initial load is owned by initializeViewer. distinctUntilChanged avoids
    // rebuilding the viewer when the mode is re-emitted with the same value.
    this.subscriptions.push(
      this.iiifViewerService.bookMode$.pipe(
        skip(1),
        distinctUntilChanged(),
      ).subscribe(() => {
        this.triggerViewerUpdate();
      })
    );

    // CDK: when the user picks a different source library in metadata-section,
    // URLs change (now include /{libraryCode}/) — refresh tiles, thumb, fallback.
    // skip(1) ignores the BehaviorSubject seed; the initial tile load happens via
    // initializeViewer, not here. distinctUntilChanged avoids redundant reloads.
    this.subscriptions.push(
      this.iiifViewerService.cdkLibraryCode$.pipe(
        skip(1),
        distinctUntilChanged(),
      ).subscribe(() => {
        const pid = this.imagePid || this.metadata?.uuid;
        if (!pid) return;
        this.failedPids.delete(pid);
        this.directImageFailedPids.delete(pid);
        this.showFallback.set(false);
        this.fallbackImageUrl.set(null);
        this.accessDenied.set(false);
        this.fallbackNotice.set(null);
        this.fallbackNoticeDismissed.set(false);
        this.releaseFallbackObjectUrl();
        this.triggerViewerUpdate();
      })
    );

    this.subscriptions.push(
      this.iiifViewerService.selectedArea$.subscribe(rect => {
        console.log('rect', rect)
        this.ngZone.run(() => {
          if (rect) {
            this.showSelectionControls = true;
            this.updateSelectionControlsPosition(rect);
          } else {
            this.showSelectionControls = false;
            this.selectionRect = null;
            this.selectionControlsPinned = false;
            this.currentImageRect = null;
          }
          this.cdr.detectChanges();

          // The first placement above runs before the controls exist in the
          // DOM, so it has to clamp against fallback dimensions. Now that
          // detectChanges() has rendered them, recompute with the measured box
          // and repaint if that moved anything.
          if (rect) {
            const before = this.selectionRect ? { ...this.selectionRect } : null;
            this.updateControlsPosition();
            if (before && this.selectionRect &&
              (before.top !== this.selectionRect.top || before.left !== this.selectionRect.left)) {
              this.cdr.detectChanges();
            }
          }
        });
      })
    );

    // Shared crop ("vystrizek") from the ?bb= query param.
    //
    // Anchored on viewerOpened$ (OpenSeadragon's `open`, fired as soon as the
    // tile source is ready) rather than imageLoaded$, which waits until every
    // visible tile of the WHOLE page has downloaded — zooming at `open` makes
    // OSD fetch tiles for the crop region only, so crop links load fast.
    this.subscriptions.push(
      this.iiifViewerService.viewerOpened$.subscribe(() => {
        this.applyBoundingBoxFromUrl();
      })
    );
  }

  /**
   * Opens a shared crop the way the legacy client did (#187): zoom so the crop
   * fills the viewer AND mark it as the selection — dimmed surroundings, frame,
   * selection controls. Zoom alone left no clue which part had been selected;
   * selection alone showed the whole page with a tiny highlight.
   *
   * The selection is locked, so pan/zoom keep working. The param is stripped
   * afterwards (replaceUrl) so a later page open doesn't re-apply it.
   */
  private applyBoundingBoxFromUrl(): void {
    const bb = this.route.snapshot.queryParamMap.get('bb');
    if (!bb) return;

    const parts = bb.split(',');
    if (parts.length !== 4) return;

    const [x, y, w, h] = parts.map(part => (part.trim() === '' ? NaN : Number(part)));
    if ([x, y, w, h].some(value => isNaN(value))) return;
    // A zero-area box would make fitBounds zoom to infinity.
    if (w <= 0 || h <= 0) return;

    const rect = new OpenSeadragon.Rect(x, y, w, h);
    this.iiifViewerService.zoomToImageRegion(rect);
    // fitBounds(immediately) fires no animation-finish, so the resize handler
    // would still think the page is at home and re-fit it, undoing the zoom.
    this.atHome = false;
    this.iiifViewerService.setSelection(rect);

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { bb: null },
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  ngAfterViewInit(): void {
    // Check if container has dimensions
    if (this.viewerContainer.nativeElement.offsetHeight > 0 && this.viewerContainer.nativeElement.offsetWidth > 0) {
      this.initializeViewer();
    } else {
      console.log('Viewer container has no dimensions, waiting for resize...');
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
            console.log('Viewer container resized, initializing viewer');
            this.initializeViewer();
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
          }
        }
      });
      this.resizeObserver.observe(this.viewerContainer.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.iiifViewerService.fallbackNoticeHeight.set(0);
    if (this.resizeSettle) {
      clearTimeout(this.resizeSettle);
      this.resizeSettle = null;
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.iiifViewerService.clearTtsHighlight();

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    // Clean up native touch event listeners
    if (this.viewerContainer?.nativeElement) {
      const container = this.viewerContainer.nativeElement;
      container.removeEventListener('touchstart', this.onTouchStart);
      container.removeEventListener('touchmove', this.onTouchMove);
      container.removeEventListener('touchend', this.onTouchEnd);
      container.removeEventListener('touchcancel', this.onTouchCancel);
    }

    if (this.viewer) {
      // Detach the watermark's viewport handlers before the viewer goes away.
      this.osdViewer.set(null);
      this.viewer.destroy();
    }

    // Release the direct-image blob after the viewer that displays it is gone.
    this.releaseFallbackObjectUrl();

    // Disable test mode when component is destroyed
    this.iiifViewerService.setTestFallbackMode(false);
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Update viewer when imagePid changes
    if (changes['imagePid'] && !changes['imagePid'].firstChange) {
      if (this.holdPage) {
        this.heldPageChange = true;
      } else {
        this.showImagePid();
      }
    }
    if (changes['holdPage'] && !this.holdPage) {
      if (this.heldInit) {
        this.heldInit = false;
        this.initializeViewer();
      } else if (this.heldPageChange) {
        this.heldPageChange = false;
        this.showImagePid();
      }
    }
  }

  /** Switches the open viewer to the page `imagePid` now names. */
  private showImagePid(): void {
    // Reset fallback state when switching to a new image. The blob object URL
    // is deliberately not revoked here — OpenSeadragon may still be painting
    // it; loadDirectImageFallback revokes the previous one as it installs the
    // next, and ngOnDestroy covers the final page.
    this.showFallback.set(false);
    this.fallbackImageUrl.set(null);
    this.accessDenied.set(false);
    this.triggerViewerUpdate();
  }

  private initializeViewer(): void {
    if (this.holdPage) {
      this.heldInit = true;
      return;
    }
    const pid = this.imagePid || this.metadata?.uuid;
    if (!pid) {
      console.error('No PID or UUID provided for IIIF viewer');
      return;
    }

    // Enable test mode in service if TEST_FALLBACK is true
    this.iiifViewerService.setTestFallbackMode(this.TEST_FALLBACK);

    // Set thumbnail as background placeholder (blur→sharp effect, single page only)
    if (this.iiifViewerService.isBookMode()) {
      this.clearThumbnailBackground();
    } else {
      this.setThumbnailBackground(pid);
    }

    // The component is re-created on every page change (the access check swaps
    // it for a loader), so the initial load must honour book mode too —
    // otherwise only the left page shows while book mode stays on.
    this.loadTileSources(pid).subscribe({
      next: (tileSources) => this.createViewer(tileSources),
      error: (error) => {
        console.error('Failed to fetch IIIF info.json', error);
        this.handleOpenFailed();
      }
    });
  }

  /**
   * Set thumbnail image as background placeholder while IIIF tiles load
   * Creates the blur→sharp progressive loading effect
   */
  private setThumbnailBackground(pid: string): void {
    // A watch left over from the previous page must not clear this one's thumbnail.
    this.stopThumbnailWatch?.();
    const thumbnailUrl = this.iiifViewerService.getThumbnailUrl(pid);
    // The watermark lays itself out on this thumbnail until the tiled image
    // exists, so it has to learn the URL at the same moment the background does.
    this.placeholderUrl.set(thumbnailUrl);
    const container = this.viewerContainer.nativeElement;
    container.style.backgroundImage = `url('${thumbnailUrl}')`;
    container.style.backgroundSize = 'contain';
    container.style.backgroundPosition = 'center';
    container.style.backgroundRepeat = 'no-repeat';
  }

  /**
   * Clear the thumbnail background after IIIF tiles have loaded
   */
  private clearThumbnailBackground(): void {
    this.stopThumbnailWatch?.();
    // Only the placeholder goes away; the watermark has the real geometry by
    // now and keeps drawing from the viewport.
    this.placeholderUrl.set(null);
    const container = this.viewerContainer.nativeElement;
    container.style.backgroundImage = '';
  }

  /**
   * Wait for the viewer's image to be fully loaded, then clear the thumbnail background.
   * Handles both IIIF tiled sources (waits for all tiles) and direct image fallbacks.
   */
  private waitForImageLoaded(): void {
    const tiledImage = this.viewer?.world.getItemAt(0);
    if (tiledImage) {
      if (tiledImage.getFullyLoaded()) {
        requestAnimationFrame(() => this.clearThumbnailBackground());
      } else {
        const onFullyLoaded = (e: any) => {
          if (e.fullyLoaded) {
            tiledImage.removeHandler('fully-loaded-change', onFullyLoaded);
            requestAnimationFrame(() => this.clearThumbnailBackground());
          }
        };
        tiledImage.addHandler('fully-loaded-change', onFullyLoaded);
      }
    } else {
      // World is empty — image not added yet (can happen with direct image fallbacks).
      // Listen for the item to be added, then wait for it to fully load.
      const onAddItem = (e: any) => {
        this.viewer?.world.removeHandler('add-item', onAddItem);
        const item = e.item;
        if (item.getFullyLoaded()) {
          requestAnimationFrame(() => this.clearThumbnailBackground());
        } else {
          const onFullyLoaded = (ev: any) => {
            if (ev.fullyLoaded) {
              item.removeHandler('fully-loaded-change', onFullyLoaded);
              requestAnimationFrame(() => this.clearThumbnailBackground());
            }
          };
          item.addHandler('fully-loaded-change', onFullyLoaded);
        }
      };
      this.viewer?.world.addHandler('add-item', onAddItem);
    }
  }

  /**
   * Drop the thumbnail placeholder as soon as it stops being useful, instead
   * of only on fully-loaded.
   *
   * The thumbnail is a static CSS background sized to the home view. Waiting
   * for fully-loaded keeps it far too long: every pan or zoom asks for new
   * tiles, so the event may not fire for a long time, and meanwhile the
   * thumbnail no longer lines up with the image and shows through around it.
   * It goes away on whichever comes first:
   * - the viewport is not at the home view (a locked zoom was restored), so
   *   the thumbnail is out of place from the start;
   * - the first pan or zoom, for the same reason — but only once the canvas
   *   has drawn some of the page, so the viewer never goes blank;
   * - OpenSeadragon has drawn a whole pyramid level at least as wide as the
   *   thumbnail, so the canvas already paints the page as sharp as the
   *   thumbnail would.
   *
   * Every check runs on `update-viewport`, which OpenSeadragon raises right
   * after it has drawn a frame, and looks at `tile.beingDrawn` (set for the
   * tiles in that frame). A loaded tile is not yet a drawn one: the WebGL
   * drawer may still be preparing it, and a tile-loaded based check cleared
   * the background a few frames before the canvas had anything on it — the
   * blank flash between thumbnail and page. A pan or zoom without anything
   * drawn yet did the same; OpenSeadragon raises those itself when the
   * layout around the viewer settles and resizes it.
   */
  private watchThumbnailPlaceholder(): void {
    this.stopThumbnailWatch?.();
    const viewer = this.viewer;
    const thumbnailUrl = this.placeholderUrl();
    if (!viewer || !thumbnailUrl) return;

    const viewport = viewer.viewport;
    const homeZoom = viewport.getHomeZoom();
    if (Math.abs(viewport.getZoom(true) - homeZoom) > homeZoom * 1e-3) {
      this.clearThumbnailBackground();
      return;
    }

    // Only a move away from the home view puts the thumbnail out of place.
    // OpenSeadragon also raises pan/zoom while the layout settles around a
    // viewer that stays at home; dropping the thumbnail then left the page
    // half drawn, tile by tile, instead of blur→sharp.
    let viewportChanged = false;
    const onViewportChange = () => {
      const zoom = viewport.getZoom();
      const home = viewport.getHomeZoom();
      const center = viewport.getCenter();
      const homeCenter = viewport.getHomeBounds().getCenter();
      const tolerance = viewport.getBounds().width * 1e-3;
      if (Math.abs(zoom - home) > home * 1e-3
        || Math.abs(center.x - homeCenter.x) > tolerance
        || Math.abs(center.y - homeCenter.y) > tolerance) {
        viewportChanged = true;
      }
    };
    viewer.addHandler('pan', onViewportChange);
    viewer.addHandler('zoom', onViewportChange);

    // Loaded tiles per pyramid level, for the current page only.
    const tiledImage = viewer.world.getItemAt(0);
    const loadedTiles = new Map<number, Set<OpenSeadragon.Tile>>();
    let targetLevel: number | null = null;

    const anyDrawn = (): boolean => {
      for (const tiles of loadedTiles.values()) {
        for (const tile of tiles) if (tile.beingDrawn) return true;
      }
      return false;
    };
    const isCovered = (): boolean => {
      if (!tiledImage || targetLevel === null) return false;
      for (const [level, tiles] of loadedTiles) {
        if (level < targetLevel) continue;
        const grid = tiledImage.source.getNumTiles(level);
        let drawn = 0;
        for (const tile of tiles) if (tile.beingDrawn) drawn++;
        if (drawn >= grid.x * grid.y) return true;
      }
      return false;
    };

    // Same task as the draw, so the browser paints the drawn canvas and the
    // removed background together.
    const onFrameDrawn = () => {
      if ((viewportChanged && anyDrawn()) || isCovered()) this.clearThumbnailBackground();
    };
    viewer.addHandler('update-viewport', onFrameDrawn);

    const onTileLoaded = (e: any) => {
      if (e.tiledImage !== tiledImage) return;
      const tile: OpenSeadragon.Tile = e.tile;
      let tiles = loadedTiles.get(tile.level);
      if (!tiles) loadedTiles.set(tile.level, tiles = new Set());
      tiles.add(tile);
    };
    if (tiledImage) viewer.addHandler('tile-loaded', onTileLoaded);

    // The thumbnail's pixel width decides which level matches it. It is
    // already in the browser cache as the container's background.
    const thumbnail = new Image();
    thumbnail.onload = () => {
      if (!tiledImage) return;
      targetLevel = this.levelMatchingWidth(tiledImage.source, thumbnail.naturalWidth);
    };
    thumbnail.src = thumbnailUrl;

    this.stopThumbnailWatch = () => {
      thumbnail.onload = null;
      viewer.removeHandler('pan', onViewportChange);
      viewer.removeHandler('zoom', onViewportChange);
      viewer.removeHandler('update-viewport', onFrameDrawn);
      viewer.removeHandler('tile-loaded', onTileLoaded);
      this.stopThumbnailWatch = null;
    };
  }

  /** Lowest pyramid level at least `width` pixels wide, or the finest level if none is. */
  private levelMatchingWidth(source: OpenSeadragon.TileSource, width: number): number {
    for (let level = source.minLevel; level <= source.maxLevel; level++) {
      if (source.dimensions.x * source.getLevelScale(level) >= width) return level;
    }
    return source.maxLevel;
  }

  private createViewer(tileSource: any): void {
    if (this.viewer) {
      this.osdViewer.set(null);
      this.stopThumbnailWatch?.();
      this.viewer.destroy();
    }

    const authHeaders = this.iiifViewerService.getAuthHeaders();

    // A re-fit scheduled for the previous viewer must not touch the new one.

    if (this.resizeSettle) { clearTimeout(this.resizeSettle); this.resizeSettle = null; }

    this.viewer = OpenSeadragon({
      element: this.viewerContainer.nativeElement,
      prefixUrl: 'https://cdn.jsdelivr.net/npm/openseadragon@4.1/build/openseadragon/images/',
      tileSources: tileSource,
      showNavigationControl: false,
      showRotationControl: false,
      showHomeControl: false,
      showZoomControl: false,
      showFullPageControl: false,
      // Tiles are fetched via the API proxy which requires the same auth token.
      // loadTilesWithAjax must be true for ajaxHeaders to be sent.
      loadTilesWithAjax: true,
      crossOriginPolicy: 'Anonymous',
      ajaxWithCredentials: false,
      ajaxHeaders: authHeaders,
      // Transparent placeholder so thumbnail background shows through
      placeholderFillStyle: 'transparent',
      // Left at OpenSeadragon's default (false) so the pyramid is walked
      // low-res → high-res and the page sharpens progressively. Setting it to
      // true pins every tile's priority to the target level, so nothing shows
      // until those tiles land and the page then appears all at once.
      // The thumbnail background covers the gap until the first tiles arrive.
      immediateRender: false,
      // OpenSeadragon's default is 0 (unlimited), which fires every tile of the
      // visible grid at once. Each one pays the CDK proxy's per-request
      // overhead, so the burst is what makes page loads feel slow — capping
      // concurrency spreads it out without dropping any tile. This is the knob
      // to reach for when proxy load is the problem: prefer it over coarsening
      // minPixelRatio below, which pays for fewer requests with image quality.
      // The request count itself is set by the tile size (see enlargeTiles).
      imageLoaderLimit: 6,
      // Caps the pyramid level OSD targets: highestLevel is clamped by
      // log2(zeroRatio / minPixelRatio), so raising this picks a coarser level.
      // Kept at OpenSeadragon's default. It was raised to 1.0 to cut proxy
      // round-trips, but that drops the finest pyramid level the viewport can
      // actually use, which is what made pages look soft at typical laptop
      // resolutions (issue #183) — zooming only partly recovers it. To cut
      // requests, enlarge tiles (enlargeTiles) and bound concurrency with
      // imageLoaderLimit above; neither costs quality. Note that tiles are fetched via AJAX and are HTTP-cached, so
      // measuring this needs a page not yet visited in the session.
      minPixelRatio: 0.5,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: true,
        flickEnabled: true,
        pinchToZoom: true,
        scrollToZoom: true
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: true,
        flickEnabled: false, // Disable flick to prevent interference with swipe
        pinchToZoom: true,
        scrollToZoom: false
      },
      minZoomLevel: 0,
      maxZoomLevel: 10,
      // Kept at 1 only while the page fits the view; updatePanConstraint loosens
      // it once the reader zooms in.
      visibilityRatio: 1,
      constrainDuringPan: false
    });
    this.viewer.addHandler('zoom', () => this.updatePanConstraint());
    this.viewer.addHandler('resize', () => this.updatePanConstraint());

    // Hand the new viewer to the watermark overlay, which projects its image
    // coordinates through this viewport.
    this.osdViewer.set(this.viewer);

    // Reset fallback state when image source opens, then wait for all tiles to render
    this.viewer.addHandler('open', () => {
      this.ngZone.run(() => {
        this.showFallback.set(false);
        this.fallbackImageUrl.set(null);
        this.accessDenied.set(false);
        this.fallbackNotice.set(null);
        this.fallbackNoticeDismissed.set(false);
        // Page loaded successfully — unlock it in the sidebar grid
        const pid = this.imagePid || this.metadata?.uuid;
        if (pid) {
          this.detailViewService.markPageAsAccessible(pid);
        }
      });
      // Set minimum zoom to fit-to-height so max zoom-out shows the full image height
      this.updateMinZoomLevel();
      // Restore locked zoom after the new page opens
      this.iiifViewerService.applyLockedZoom();
      this.updatePanConstraint();

      // Wait for image content to be rendered before clearing thumbnail background.
      // For IIIF tiled images this creates a blur→sharp progressive loading effect.
      // For direct image fallbacks, the single "tile" loads fully at once.
      this.waitForImageLoaded();
      // After applyLockedZoom, so the watch sees where the viewport actually is.
      this.watchThumbnailPlaceholder();
    });

    this.viewer.addHandler('update-viewport', () => {
      if (this.showSelectionControls) {

      }
    });

    this.viewer.addHandler('animation', () => {
      this.ngZone.run(() => {
        this.updateControlsPosition();
      });
    });
    this.viewer.addHandler('update-viewport', () => {
      this.ngZone.run(() => {
        this.updateControlsPosition();
      });
    });

    // The container changes size without the image reopening — most visibly when
    // the AI panel splits the viewer in half — and minZoomLevel is derived from
    // that size, so recompute it on resize (issue #161).
    // Remember whether the reader left the page at its fitted ("home") view, so a
    // layout change (info panel shown/hidden or resized, phone sheet closed)
    // re-fits the page instead of leaving it cropped — but never undoes a zoom
    // the reader chose.
    // While the container is still animating (panel slide = 300ms) the zoom
    // OpenSeadragon reports is transient, so it is ignored, and the re-fit
    // happens once the size has settled.
    const isAtFittedZoom = (): boolean => {
      const viewport = this.viewer?.viewport;
      if (!viewport) return false;
      const fitted = Math.max(viewport.getHomeZoom(), (this.viewer as any).minZoomLevel || 0);
      return Math.abs(viewport.getZoom(true) - fitted) <= fitted * 0.02;
    };
    // A locked zoom is the reader's choice, so a layout change must not re-fit it.
    this.viewer.addHandler('open', () => { this.atHome = !this.iiifViewerService.isZoomLocked(); });
    this.viewer.addHandler('animation-finish', () => {
      if (this.resizeSettle) return;
      this.atHome = isAtFittedZoom();
    });
    this.viewer.addHandler('resize', () => {
      this.updateMinZoomLevel();
      if (this.resizeSettle) clearTimeout(this.resizeSettle);
      this.resizeSettle = setTimeout(() => {
        this.resizeSettle = null;
        if (this.atHome && this.viewer) {
          this.updateMinZoomLevel();
          this.viewer.viewport.goHome(true);
          const min = (this.viewer as any).minZoomLevel || 0;
          if (this.viewer.viewport.getZoom(true) < min) {
            this.viewer.viewport.zoomTo(min, undefined, true);
          }
        }
      }, 350);
    });

    // Setup native touch event listeners for swipe navigation
    // Note: We use native touch events instead of OpenSeadragon's gesture system
    // because they're more reliable across different browsers and devices
    this.setupNativeTouchListeners();

    this.viewer.addHandler('open-failed', () => {
      this.handleOpenFailed();
    });

    this.iiifViewerService.setViewer(this.viewer);
  }

  private handleOpenFailed(): void {
    const currentPid = this.imagePid || this.metadata?.uuid;
    if (!currentPid) {
      console.error('No PID available for fallback');
      this.showFallback.set(true);
      return;
    }

    // Check if direct image already failed for this PID.
    // The fallback <img> carries no Authorization header, so it must point at
    // the thumbnail (always readable) rather than the full image, which 403s
    // for licensed pages and would render as a broken image.
    if (this.directImageFailedPids.has(currentPid)) {
      console.log(`Both IIIF and direct image failed for PID: ${currentPid}. Showing thumbnail fallback.`);
      this.showThumbnailFallback(currentPid, this.accessDenied() ? 'forbidden' : 'unavailable');
      return;
    }

    // Check if IIIF already failed (meaning this is the direct image failing now)
    if (this.failedPids.has(currentPid)) {
      console.log(`Direct image fallback also failed for PID: ${currentPid}. Showing thumbnail fallback.`);
      this.directImageFailedPids.add(currentPid);
      this.showThumbnailFallback(currentPid, 'unavailable');

      setTimeout(() => {
        this.directImageFailedPids.delete(currentPid);
      }, 5000);
      return;
    }

    // IIIF failed, try direct image URL
    this.failedPids.add(currentPid);
    this.loadDirectImageFallback(currentPid);

    setTimeout(() => {
      this.failedPids.delete(currentPid);
    }, 5000);
  }

  /**
   * Load the direct (non-tiled) image as the viewer's source.
   *
   * OpenSeadragon's ImageTileSource fetches with `image.src = url` — a plain
   * <img> request that ignores the viewer's `ajaxHeaders`. Licensed pages
   * (e.g. `dnnto`) therefore hit the API anonymously and get 403 even when the
   * user is signed in. Fetching the bytes ourselves via HttpClient lets the
   * Authorization header through; the resulting blob is handed to OpenSeadragon
   * as an object URL, which `new Image()` can load without any credentials.
   */
  private loadDirectImageFallback(pid: string): void {
    const directImageUrl = this.iiifViewerService.getDirectImageUrl(pid);
    console.log(`IIIF failed, attempting fallback image: ${directImageUrl}`);

    const authHeaders = this.iiifViewerService.getAuthHeaders();
    let headers = new HttpHeaders();
    if (authHeaders['Authorization']) {
      headers = headers.set('Authorization', authHeaders['Authorization']);
    }

    this.http.get(directImageUrl, {
      headers,
      responseType: 'blob',
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).subscribe({
      next: (blob) => {
        // Navigation may have moved on while the request was in flight.
        if ((this.imagePid || this.metadata?.uuid) !== pid) return;

        this.releaseFallbackObjectUrl();
        this.fallbackObjectUrl = URL.createObjectURL(blob);

        const directImageTileSource = { type: 'image', url: this.fallbackObjectUrl };

        this.ngZone.run(() => {
          this.accessDenied.set(false);

          if (this.viewer) {
            this.viewer.open({ tileSource: directImageTileSource });
          } else {
            // Viewer was never created (info.json fetch failed before createViewer ran).
            // Create it now with the direct image as tile source.
            this.createViewer(directImageTileSource);
          }
        });
      },
      error: (error) => {
        if ((this.imagePid || this.metadata?.uuid) !== pid) return;

        // 403 means the image is there but this user may not see it — a licence
        // prompt is the useful response, not a generic "image broken" fallback.
        const denied = error?.status === 403 || error?.status === 401;
        if (denied) {
          console.log(`Direct image denied (HTTP ${error.status}) for PID: ${pid}. User lacks licence access.`);
        } else {
          console.error(`Direct image fallback failed for PID: ${pid}`, error);
        }

        this.directImageFailedPids.add(pid);
        this.ngZone.run(() => this.accessDenied.set(denied));
        this.showThumbnailFallback(pid, denied ? 'forbidden' : 'unavailable');

        setTimeout(() => {
          this.directImageFailedPids.delete(pid);
        }, 5000);
      }
    });
  }

  /** Swap the viewer for the page thumbnail and say why in the notice above it. */
  private showThumbnailFallback(pid: string, reason: FallbackReason): void {
    this.ngZone.run(() => {
      this.fallbackImageUrl.set(this.iiifViewerService.getThumbnailUrl(pid));
      this.showFallback.set(true);
      this.fallbackNotice.set(reason);
      this.cdr.detectChanges();
    });
  }

  onFallbackNoticeAction(id: string): void {
    if (id === 'retry') {
      this.retryImage();
    } else if (id === 'login') {
      // Same entry point as the header's login: the terms page, then back here.
      this.authService.startLogin();
    }
  }

  dismissFallbackNotice(): void {
    this.fallbackNoticeDismissed.set(true);
  }

  /** Load the current page again from the start of the IIIF → direct image → thumbnail chain. */
  retryImage(): void {
    const pid = this.imagePid || this.metadata?.uuid;
    if (!pid) return;
    this.failedPids.delete(pid);
    this.directImageFailedPids.delete(pid);
    this.showFallback.set(false);
    this.fallbackImageUrl.set(null);
    this.accessDenied.set(false);
    this.fallbackNotice.set(null);
    if (this.viewer) {
      this.triggerViewerUpdate();
    } else {
      // info.json failed before the viewer was ever created.
      this.initializeViewer();
    }
  }

  /** Revoke the currently held fallback object URL, if any. */
  private releaseFallbackObjectUrl(): void {
    if (this.fallbackObjectUrl) {
      URL.revokeObjectURL(this.fallbackObjectUrl);
      this.fallbackObjectUrl = null;
    }
  }

  private updateViewerSource(): void {
    if (!this.viewer) return;

    const pid = this.imagePid || this.metadata?.uuid;
    if (!pid) return;

    const infoUrl = this.iiifViewerService.getIIIFInfoUrl(pid);
    this.viewer.open({ tileSource: infoUrl });
  }

  /**
   * Triggers a viewer update. Any in-flight update is cancelled via switchMap.
   */
  private triggerViewerUpdate(): void {
    if (!this.viewer) return;
    this.updateViewer$.next();
  }

  /**
   * Builds the observable that updates the viewer for the current page/book mode state.
   * Used with switchMap so rapid navigation cancels in-flight HTTP requests.
   */
  private buildViewerUpdate() {
    if (!this.viewer) return EMPTY;

    const currentPid = this.imagePid || this.metadata?.uuid;
    if (!currentPid) return EMPTY;

    // Leave area selection when another page opens (as the old client did) —
    // the selection belongs to the page that is going away.
    this.iiifViewerService.cancelSelectionOnPageChange();

    // Clear existing overlays when changing pages
    this.iiifViewerService.clearAllOverlays();

    return this.loadTileSources(currentPid).pipe(
      switchMap((tileSources) => {
        // The previous page stays on the canvas until now. Its thumbnail goes in
        // as the canvas is cleared for the new one (blur→sharp, single page
        // only), not earlier, or it would show around a page of other proportions.
        // A locked zoom opens away from home, where the whole-page thumbnail
        // would only flash before it is dropped (watchThumbnailPlaceholder).
        if (!this.iiifViewerService.isBookMode() && !this.iiifViewerService.isZoomLocked()) {
          this.setThumbnailBackground(currentPid);
        } else {
          this.clearThumbnailBackground();
        }
        this.viewer?.open(tileSources);
        return EMPTY;
      })
    );
  }

  /**
   * Fetches info.json for the page (and, in book mode, the following page) and
   * returns what OpenSeadragon should open: a single info.json, or two sources
   * laid side by side. If the second page's info.json fails (e.g. a licensed
   * page), the left page is still shown on its own.
   */
  private loadTileSources(currentPid: string): Observable<any> {
    const nextPagePid = this.iiifViewerService.isBookMode() ? this.getNextPagePid() : null;
    const left$ = this.fetchInfoJson(currentPid);
    if (!nextPagePid) return left$;

    return left$.pipe(
      switchMap((infoJson) => this.fetchInfoJson(nextPagePid).pipe(
        map((nextInfoJson) => [
          { tileSource: infoJson, x: 0, y: 0, width: 0.5 },
          { tileSource: nextInfoJson, x: 0.5, y: 0, width: 0.5 }
        ] as any),
        catchError((error) => {
          console.warn('Book mode: next page info.json failed, showing single page', error);
          return of(infoJson);
        })
      ))
    );
  }

  /** GET + normalise one page's info.json through the API proxy. */
  private fetchInfoJson(pid: string): Observable<any> {
    const authHeaders = this.iiifViewerService.getAuthHeaders();
    let headers = new HttpHeaders();
    if (authHeaders['Authorization']) {
      headers = headers.set('Authorization', authHeaders['Authorization']);
    }
    const infoUrl = this.iiifViewerService.getIIIFInfoUrl(pid);
    return this.http.get(infoUrl, {
      headers,
      context: new HttpContext().set(SKIP_ERROR_INTERCEPTOR, true)
    }).pipe(
      map((infoJson: any) => {
        this.processInfoJson(infoJson, infoUrl);
        return infoJson;
      })
    );
  }

  /**
   * Process IIIF info.json for use with OpenSeadragon:
   * 1. Fix HTTP URLs to HTTPS (prevents mixed content errors)
   * 2. Ensure @id points to the API proxy URL for tile resolution
   * 3. Remove sizes array to prevent wrong tile grid calculation
   *
   * @param infoJson - The info.json response object (mutated in place)
   * @param apiInfoUrl - The API proxy URL used to fetch this info.json.
   *   When provided, @id is set to the base image URL derived from it
   *   so OpenSeadragon always resolves tiles through the API proxy —
   *   not through an internal imageserver URL that may not be reachable.
   */
  private processInfoJson(infoJson: any, apiInfoUrl?: string): void {
    this.fixHttpUrls(infoJson);

    // Ensure OpenSeadragon resolves tiles through the API proxy.
    // The info.json 'id' field often points to an internal imageserver that
    // is not publicly accessible. Override @id with the API proxy base URL
    // so tile requests go through the same proxy that served info.json.
    if (apiInfoUrl) {
      // info.json URL is ".../info.json", the base image URL is the parent path
      const baseUrl = apiInfoUrl.replace(/\/info\.json$/, '');
      infoJson['@id'] = baseUrl;
      delete infoJson['id'];
    } else if (infoJson['id'] && infoJson['@id']) {
      delete infoJson['id'];
    }

    // Remove sizes array to prevent OpenSeadragon bug where it uses sizes
    // as level dimensions instead of computing from actual width/height.
    // When sizes.length coincidentally equals maxLevel+1 but doesn't include
    // the full resolution, OSD only tiles a fraction of the image.
    if (infoJson.sizes && infoJson.tiles) {
      delete infoJson.sizes;
    }

    this.enlargeTiles(infoJson);
  }

  /**
   * Raise the tile size OpenSeadragon requests to IIIF_TILE_SIZE.
   *
   * Servers advertise 256px tiles, so a typical page (~1.5×2 kpx) at
   * fit-to-screen costs ~80 requests across the pyramid, each paying the CDK
   * proxy's per-request overhead. The same pixels in 512px tiles take ~25.
   * Only the request grid changes — levels, scale factors and quality do not.
   *
   * Skipped for level0 servers: they serve only their precomputed tiles, so a
   * region off that grid would fail.
   */
  private enlargeTiles(infoJson: any): void {
    if (!Array.isArray(infoJson.tiles)) return;

    const profile = Array.isArray(infoJson.profile) ? infoJson.profile[0] : infoJson.profile;
    if (typeof profile === 'string' && /level0/.test(profile)) return;

    for (const tile of infoJson.tiles) {
      if ((tile.width ?? 0) >= IIIF_TILE_SIZE) continue;
      tile.width = IIIF_TILE_SIZE;
      tile.height = IIIF_TILE_SIZE;
    }
  }

  /**
   * Fix HTTP URLs in IIIF info.json to use HTTPS (prevents mixed content errors)
   * Recursively processes all string values in the JSON
   * NOTE: Preserves @context and protocol fields as OpenSeadragon needs exact
   * "http://iiif.io/api/image/..." patterns to identify IIIF tile sources
   */
  private fixHttpUrls(obj: any): void {
    if (!obj || typeof obj !== 'object') return;

    // Fields that OpenSeadragon checks for exact "http://..." patterns
    const preserveFields = ['@context', 'protocol', 'profile'];

    for (const key of Object.keys(obj)) {
      // Skip IIIF spec fields that must remain as http://
      if (preserveFields.includes(key)) continue;

      const value = obj[key];
      if (typeof value === 'string' && value.startsWith('http://')) {
        obj[key] = value.replace('http://', 'https://');
      } else if (typeof value === 'object') {
        this.fixHttpUrls(value);
      }
    }
  }

  /**
   * Gets the PID of the next page from DetailViewService
   * Returns null if there is no next page
   */
  private getNextPagePid(): string | null {
    const pages = this.detailViewService.pages;
    const currentPageIndex = this.detailViewService.currentPageIndex;

    if (currentPageIndex < pages.length - 1) {
      return pages[currentPageIndex + 1].pid;
    }

    return null;
  }

  private currentImageRect: OpenSeadragon.Rect | null = null;

  private updateSelectionControlsPosition(imageRect: OpenSeadragon.Rect) {
    this.currentImageRect = imageRect;
    this.updateControlsPosition();
  }

  /** Gap between the selection box and the floating controls, in px. */
  private static readonly CONTROLS_GAP = 10;
  /** Keep this much clearance from the viewer edges when clamping. */
  private static readonly CONTROLS_MARGIN = 8;
  /** Fallback size used before the controls have been measured (see SCSS). */
  private static readonly CONTROLS_FALLBACK_WIDTH = 48;
  private static readonly CONTROLS_FALLBACK_HEIGHT = 168;

  private updateControlsPosition() {
    if (!this.viewer || !this.currentImageRect || !this.showSelectionControls) return;

    const viewportRect = this.viewer.viewport.imageToViewportRectangle(this.currentImageRect);
    const elementRect = this.viewer.viewport.viewportToViewerElementRectangle(viewportRect);

    const container = this.viewerContainer?.nativeElement as HTMLElement | undefined;
    const containerWidth = container?.clientWidth ?? 0;
    const containerHeight = container?.clientHeight ?? 0;

    // Measure the rendered controls when available so the clamp matches the
    // actual box (its height depends on how many buttons config enables).
    const controlsEl = container?.querySelector('app-selection-controls') as HTMLElement | null;
    const controlsWidth = controlsEl?.offsetWidth || IIIFViewer.CONTROLS_FALLBACK_WIDTH;
    const controlsHeight = controlsEl?.offsetHeight || IIIFViewer.CONTROLS_FALLBACK_HEIGHT;

    const gap = IIIFViewer.CONTROLS_GAP;
    const margin = IIIFViewer.CONTROLS_MARGIN;

    if (this.selectionControlsPinned && this.selectionRect) {
      this.clampPinnedControls(containerWidth, containerHeight, controlsWidth, controlsHeight);
      return;
    }

    // Preferred placement: just outside the selection's right edge.
    let left = elementRect.x + elementRect.width + gap;

    if (containerWidth > 0) {
      const overflowsRight = left + controlsWidth + margin > containerWidth;
      if (overflowsRight) {
        // Flip to the selection's left edge; if that would also clip (selection
        // is wide or hugs the left), clamp inside the viewer instead.
        const flipped = elementRect.x - gap - controlsWidth;
        left = flipped >= margin
          ? flipped
          : Math.max(margin, containerWidth - controlsWidth - margin);
      }
    }

    // Vertically the controls track the selection's top edge, clamped so they
    // never run past the bottom (or above the top) of the viewer.
    let top = elementRect.y;
    if (containerHeight > 0) {
      const maxTop = Math.max(margin, containerHeight - controlsHeight - margin);
      top = Math.min(Math.max(top, margin), maxTop);
    }

    // `update-viewport` and `animation` fire continuously. Allocating a new
    // object each time would hand the template a fresh identity on every frame
    // and re-run the bindings for the floating controls; mutate in place and
    // bail out when the position is unchanged.
    if (this.selectionRect) {
      if (this.selectionRect.top === top && this.selectionRect.left === left) return;
      this.selectionRect.top = top;
      this.selectionRect.left = left;
      return;
    }

    this.selectionRect = { top, left };
  }

  /** Keeps a dragged toolbar inside the viewer (after a drag, resize or collapse). */
  private clampPinnedControls(containerWidth: number, containerHeight: number,
                              controlsWidth: number, controlsHeight: number) {
    if (!this.selectionRect) return;
    const margin = IIIFViewer.CONTROLS_MARGIN;
    if (containerWidth > 0) {
      const maxLeft = Math.max(margin, containerWidth - controlsWidth - margin);
      this.selectionRect.left = Math.min(Math.max(this.selectionRect.left, margin), maxLeft);
    }
    if (containerHeight > 0) {
      const maxTop = Math.max(margin, containerHeight - controlsHeight - margin);
      this.selectionRect.top = Math.min(Math.max(this.selectionRect.top, margin), maxTop);
    }
  }

  onSelectionControlsDrag(delta: { dx: number; dy: number }) {
    if (!this.selectionRect) return;
    this.selectionControlsPinned = true;
    this.selectionRect.left += delta.dx;
    this.selectionRect.top += delta.dy;
    this.updateControlsPosition();
  }

  onSelectionControlsCollapsedChange(collapsed: boolean) {
    this.selectionControlsCollapsed = collapsed;
    // The toolbar's height changes; re-clamp once the new size is rendered.
    this.cdr.detectChanges();
    this.updateControlsPosition();
  }

  onText() {
    if (this.currentImageRect && this.imagePid && this.viewer) {
      // Get image dimensions from the viewer
      const tiledImage = this.viewer?.world.getItemAt(0);
      if (!tiledImage) {
        console.warn('No tiled image available');
        return;
      }

      const imageSize = tiledImage.getContentSize();
      const imageWidth = imageSize.x;
      const imageHeight = imageSize.y;

      console.log('Image dimensions:', { imageWidth, imageHeight });
      console.log('Selection rect (image coords):', this.currentImageRect);

      // Convert selection rect to the format expected by getTextInBox: [x1, y1, x2, y2]
      const box = [
        this.currentImageRect.x,
        this.currentImageRect.y,
        this.currentImageRect.x + this.currentImageRect.width,
        this.currentImageRect.y + this.currentImageRect.height
      ];

      console.log('Box coordinates [x1, y1, x2, y2]:', box);

      // Fetch ALTO XML and extract text
      this.altoService.fetchAltoXml(this.imagePid).subscribe({
        next: (altoXml) => {
          const altoDims = this.altoService.getAltoDimensions(altoXml);
          console.log('ALTO dimensions:', altoDims);

          const extractedText = this.altoService.getTextInBox(altoXml, box, imageWidth, imageHeight);
          console.log('Extracted text from selection:', extractedText);

          if (!extractedText) {
            console.warn('No text found in selection. This might be due to coordinate mismatch.');
            return;
          }
          this.aiPanelService.showText(extractedText, this.imagePid || undefined);
        },
        error: (error) => {
          console.error('Error fetching ALTO XML:', error);
        }
      });
    } else {
      console.warn('No selection or image PID available for text extraction');
    }
  }

  onExport() {
    // Selecting an area stays allowed under a restricted license — only taking
    // the image away is blocked. Checked here and not just on the button because
    // the Enter-key shortcut in `handleEnterPress` calls this directly.
    if (!this.detailViewService.isActionAllowed('crop')) return;

    if (this.currentImageRect && this.imagePid) {
      const rect = {
        x: this.currentImageRect.x,
        y: this.currentImageRect.y,
        width: this.currentImageRect.width,
        height: this.currentImageRect.height
      };
      this.exportService.exportJpegCrop(this.imagePid, rect);
    } else {
      console.warn('No selection or image PID available for export');
    }
  }

  @HostListener('document:keydown.enter', ['$event'])
  handleEnterPress(event: Event) {
    if (this.showSelectionControls && this.selectionRect) {
      event.preventDefault();
      this.onExport();
    }
  }

  onShare() {
    if (this.currentImageRect && this.metadata) {
      const x = Math.round(this.currentImageRect.x);
      const y = Math.round(this.currentImageRect.y);
      const w = Math.round(this.currentImageRect.width);
      const h = Math.round(this.currentImageRect.height);
      const bb = `${x},${y},${w},${h}`;

      this.recordHandlerService.openShareDialog(this.metadata, { bb });
    }
  }

  onSelectionCancel() {
    this.iiifViewerService.setSelectionMode(false);
  }

  /** Reads the selected area aloud, or stops reading when it is already running. */
  onSelectionRead() {
    if (this.ttsService.isReading()) {
      this.ttsService.stop();
      return;
    }
    const region = this.iiifViewerService.getSelectedRegion();
    if (!region || !this.imagePid) return;
    this.ttsService.startReading(this.imagePid, this.detailViewService.document?.uuid, region);
  }

  onSelectionTranslate() {
    const region = this.iiifViewerService.getSelectedRegion();
    if (!region || !this.imagePid) return;
    this.aiPanelService.showTranslation(this.imagePid, undefined, region);
  }

  onSelectionSummarize() {
    const region = this.iiifViewerService.getSelectedRegion();
    if (!region || !this.imagePid) return;
    this.aiPanelService.showSummary(this.imagePid, region);
  }

  /**
   * Which horizontal edges of the page (both pages in book mode) the viewport
   * shows. With the whole width in view - the fitted, un-zoomed page in any
   * container (issue #161) - both do.
   */
  private visiblePageEdges(): { left: boolean; right: boolean } {
    if (!this.viewer) return { left: false, right: false };
    const view = this.viewer.viewport.getBounds(true);
    const page = this.viewer.world.getHomeBounds();
    const tolerance = view.width * this.SWIPE_CONFIG.edgeTolerance;
    return {
      left: view.x <= page.x + tolerance,
      right: view.x + view.width >= page.x + page.width - tolerance
    };
  }

  /**
   * Navigate to previous or next page based on swipe direction
   */
  private navigateBySwipe(direction: 'left' | 'right'): void {
    this.ngZone.run(() => {
      if (direction === 'left') {
        this.detailViewService.goToNext();
      } else {
        this.detailViewService.goToPrevious();
      }
    });
  }

  /**
   * Setup native touch event listeners for swipe navigation
   * Uses native events for maximum compatibility across browsers and devices.
   * The handlers are arrow functions passed as they are (no bind), so a second
   * call (direct-image fallback re-creates the viewer) does not add them twice
   * and ngOnDestroy can remove them.
   */
  private setupNativeTouchListeners(): void {
    const container = this.viewerContainer.nativeElement;

    container.addEventListener('touchstart', this.onTouchStart, { passive: true });
    container.addEventListener('touchmove', this.onTouchMove, { passive: true });
    container.addEventListener('touchend', this.onTouchEnd, { passive: false });
    container.addEventListener('touchcancel', this.onTouchCancel, { passive: true });
  }

  // Stable references for add/removeEventListener; the logic lives in the
  // handle* methods.
  private onTouchStart = (e: TouchEvent): void => this.handleTouchStart(e);
  private onTouchMove = (e: TouchEvent): void => this.handleTouchMove(e);
  private onTouchEnd = (e: TouchEvent): void => this.handleTouchEnd(e);
  private onTouchCancel = (): void => this.resetTouchState();

  /**
   * Touch start. The first finger starts a gesture and records where it is and
   * which page edges are visible; a further finger only marks it as multi-touch.
   */
  private handleTouchStart(e: TouchEvent): void {
    if (!this.touchState.tracking && e.touches.length === 1) {
      this.touchState.startX = e.touches[0].clientX;
      this.touchState.startY = e.touches[0].clientY;
      this.touchState.startTime = Date.now();
      this.touchState.tracking = true;
      this.touchState.edges = this.visiblePageEdges();
    }
    this.touchState.maxTouches = Math.max(this.touchState.maxTouches, e.touches.length);
  }

  private handleTouchMove(e: TouchEvent): void {
    this.touchState.maxTouches = Math.max(this.touchState.maxTouches, e.touches.length);
  }

  /**
   * Touch end. Once the last finger lifts, a one-finger horizontal drag that is
   * long enough (or a quick flick) turns the page - but only from an edge that
   * was in view when the drag started: swiping left needs the right edge,
   * swiping right the left one. Zoomed in mid-page, the same drag just pans.
   */
  private handleTouchEnd(e: TouchEvent): void {
    // Fingers still down: the gesture is not over yet.
    if (e.touches.length > 0) return;

    const state = this.touchState;
    const touch = e.changedTouches[0];
    if (!this.viewer || !state.tracking || state.maxTouches !== 1 || !touch
      || this.iiifViewerService.inSelectionMode()) {
      this.resetTouchState();
      return;
    }

    const deltaX = touch.clientX - state.startX;
    const deltaY = touch.clientY - state.startY;
    const duration = Math.max(1, Date.now() - state.startTime);
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    const width = this.viewerContainer.nativeElement.clientWidth || window.innerWidth;

    const isHorizontal = absDeltaX > absDeltaY * (1 / this.SWIPE_CONFIG.maxVerticalRatio);
    const isLongDrag = absDeltaX >= width * this.SWIPE_CONFIG.minDistanceRatio;
    const isFlick = absDeltaX >= this.SWIPE_CONFIG.flickDistance
      && absDeltaX / duration >= this.SWIPE_CONFIG.flickVelocity;
    const direction = deltaX < 0 ? 'left' : 'right';
    const fromEdge = direction === 'left' ? state.edges.right : state.edges.left;

    if (isHorizontal && (isLongDrag || isFlick) && fromEdge) {
      e.preventDefault();
      this.navigateBySwipe(direction);
    }

    this.resetTouchState();
  }

  /**
   * Reset touch state after gesture completes
   */
  private resetTouchState(): void {
    this.touchState.tracking = false;
    this.touchState.maxTouches = 0;
  }

  /**
   * How far the reader may pan the page off the view. With visibilityRatio 1 a
   * zoomed-in page has to fill the whole view, so on release OpenSeadragon
   * springs its edge back to the viewer edge and a small article near the left
   * (or right) margin can't be dragged to the middle to read it. Once the page
   * is wider than the view, half the view may show empty space instead; while
   * it fits, it stays pinned, so the fitted page (and a touch swipe that turns
   * it) doesn't slide aside.
   */
  private updatePanConstraint(): void {
    const viewport = this.viewer?.viewport as any;
    if (!viewport) return;
    const page = this.viewer!.world.getHomeBounds();
    // Viewport coordinates: the view is 1 / zoom wide. Target zoom, so the
    // constraint applied at the end of a zoom animation already matches it.
    const zoomedIn = page.width * viewport.getZoom(false) > 1.001;
    viewport.visibilityRatio = zoomedIn ? 0.5 : 1;
  }

  /**
   * Set minZoomLevel so the maximum zoom-out level fits the whole image in the container.
   * Called after each 'open' event when image dimensions are known.
   */
  private updateMinZoomLevel(): void {
    if (!this.viewer) return;
    const item = this.viewer.world.getItemAt(0);
    if (!item) return;

    const containerSize = this.viewer.viewport.getContainerSize();
    const imageSize = item.getContentSize();
    if (containerSize.x === 0 || containerSize.y === 0 || imageSize.x === 0 || imageSize.y === 0) return;

    // Viewport zoom where the image height exactly fills the container height.
    // OSD normalizes by image width, so: fitHeightZoom = (containerH/containerW) * (imageW/imageH)
    const fitHeightZoom = (containerSize.y / containerSize.x) * (imageSize.x / imageSize.y);
    // In a container narrower than the page (portrait phone) fitting the height
    // crops the page sides, so cap at zoom 1 (width fits): the whole page always
    // fits at the minimum zoom.
    (this.viewer as any).minZoomLevel = Math.min(fitHeightZoom, 1);
  }
}
