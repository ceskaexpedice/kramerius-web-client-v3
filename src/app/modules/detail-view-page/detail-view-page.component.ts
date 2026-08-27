import { Component, effect, inject, OnInit, OnDestroy, AfterViewInit, signal, HostBinding, computed, ViewChild, ElementRef } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { EnvironmentService } from '../../shared/services/environment.service';
import { DetailViewService } from './services/detail-view.service';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { DocumentTypeEnum } from '../constants/document-type';
import { DocumentAccessibilityEnum } from '../constants/document-accessibility';
import { AdminModeService } from '../../shared/services';
import { Observable, Subscription } from 'rxjs';
import { map, shareReplay, distinctUntilChanged, skip, filter } from 'rxjs/operators';
import { PdfService } from '../../shared/services/pdf.service';
import { IIIFViewerService } from '../../shared/services/iiif-viewer.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { ActivatedRoute, Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';
import { Store } from '@ngrx/store';
import { selectArticleDetail } from '../../shared/state/document-detail/document-detail.selectors';
import { fromSolrToMetadata } from '../../shared/models/metadata.model';
import { DocumentInfoService } from '../../shared/services/document-info.service';
import { UserService } from '../../shared/services/user.service';
import { MatDialog } from '@angular/material/dialog';
import { DontShowAgainService, DontShowDialogs } from '../../shared/services/dont-show-again.service';
import { RestrictedPagesInfoDialogComponent } from '../../shared/dialogs/restricted-pages-info-dialog/restricted-pages-info-dialog.component';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { SearchService } from '../../shared/services/search.service';
import { AiPanelService } from '../../shared/services/ai-panel.service';
import { normalizeIssueTypeCode } from '../../shared/utils/issue-type-code';
import { TtsService } from '../../shared/services/tts.service';
import { DocumentSearchService } from '../../shared/services/document-search.service';
import { UiStateService } from '../../shared/services/ui-state.service';
import { AdminActionsService } from '../../shared/services/admin-actions.service';
import { GeoreferenceService } from '../../shared/services/georeference.service';
import { ConfigService } from '../../core/config/config.service';
import { MapViewerService } from '../../shared/services/map-viewer.service';
import { DetailFullscreenService } from '../../shared/services/detail-fullscreen.service';
import { FullscreenComponent } from '../../shared/components/fullscreen/fullscreen.component';
import { MusicService } from '../music/services/music.service';
import { SoundService } from '../../shared/services/sound.service';
import { ViewerControls } from '../../shared/components/viewer-controls/viewer-controls';

@Component({
  selector: 'app-detail-view-page',
  templateUrl: './detail-view-page.component.html',
  styleUrl: './detail-view-page.component.scss',
  standalone: false,
  providers: [MapViewerService]
})
export class DetailViewPageComponent implements OnInit, OnDestroy, AfterViewInit {

  private krameriusBaseUrl: string;
  private subscriptions: Subscription[] = [];

  @ViewChild('contentFullscreen') contentFullscreen!: FullscreenComponent;

  public detailViewService = inject(DetailViewService);
  public recordHandler = inject(RecordHandlerService);
  public adminModeService = inject(AdminModeService);
  public pdfService = inject(PdfService);
  public iiifViewerService = inject(IIIFViewerService);
  public documentInfoService = inject(DocumentInfoService);
  public translate = inject(TranslateService);
  private store = inject(Store);
  public userService = inject(UserService);
  private dialog = inject(MatDialog);
  private dontShowAgainService = inject(DontShowAgainService);
  public breakpointService = inject(BreakpointService);
  public searchService = inject(SearchService);
  public aiPanelService = inject(AiPanelService);
  private ttsService = inject(TtsService);
  private documentSearchService = inject(DocumentSearchService);
  private uiState = inject(UiStateService);
  public adminActionsService = inject(AdminActionsService);
  public georeferenceService = inject(GeoreferenceService);
  private configService = inject(ConfigService);
  public detailFullscreen = inject(DetailFullscreenService);
  public musicService = inject(MusicService);
  public soundService = inject(SoundService);

  @HostBinding('style.--license-bar-offset')
  get licenseBarOffset() { return this.uiState.licenseBarVisible() ? 'var(--license-bar-height)' : '0px'; }

  // TODO: set to false to keep TTS playing when navigating away
  private readonly stopTtsOnLeave = true;

  // Mobile nav bar
  mobileNavItemsBase: MobileNavItem[] = [
    { id: 'description', label: 'description', icon: 'icon-note' },
    { id: 'pages', label: 'pages--tab', icon: 'icon-simcard-2' },
    { id: 'export', label: 'export', icon: 'icon-download' },
  ];
  mobileSearchNavItem: MobileNavItem = { id: 'results', label: 'results', icon: 'icon-receipt-search' };
  mobileAiNavItem: MobileNavItem = { id: 'ai', label: 'ai.tab', icon: 'icon-magicpen' };
  hasSearchResults = signal(false);
  mobileActivePanel = signal<string>('');
  mobileSlideUpOpen = signal(false);

  // Immersive mobile chrome: the bottom nav bar is hidden by default and
  // toggled by a clean tap on the viewer (see ViewerTapToggleDirective), then
  // hidden again when a slide-up panel opens.
  mobileNavVisible = signal(false);
  // Reserved height (px) the visible nav bar takes from the viewer.
  private static readonly MOBILE_NAV_BAR_HEIGHT = 60;
  private static readonly NAV_HEIGHT_ANIM_MS = 250;
  private navHeightRaf: number | null = null;
  private navHeightCurrent = 0;

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  // Article detail observable - converted to metadata format
  articleMetadata$: Observable<any>;

  // Active sidebar tab id ('articles' when an article is selected, 'pages' otherwise)
  activeSidebarTab$: Observable<string>;

  constructor(
    private envService: EnvironmentService,
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router,
    route: ActivatedRoute,
    private hostRef: ElementRef<HTMLElement>
  ) {
    // Animate the reserved nav-bar height so the viewer grows/shrinks smoothly
    // when the immersive bar shows/hides. Driven in JS because a CSS transition
    // cannot interpolate a calc() height that changes via a custom property.
    effect(() => {
      const target = this.mobileNavVisible() ? DetailViewPageComponent.MOBILE_NAV_BAR_HEIGHT : 0;
      this.animateMobileNavBarHeight(target);
    });
    this.activeSidebarTab$ = route.queryParamMap.pipe(
      map(params => (params.get('article') ? 'articles' : 'pages')),
      distinctUntilChanged()
    );

    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);

    effect(() => {
      if (this.detailViewService.isDocumentAccessDenied()) {
        if (this.dontShowAgainService.shouldShowDialog(DontShowDialogs.RestrictedPagesInfoDialog)) {
          this.dialog.open(RestrictedPagesInfoDialogComponent, {
            panelClass: 'simple-dialog-panel'
          });
        }
      }
    });

    // Probe georeference availability for the current page (map documents only)
    effect(() => {
      // Track page index so the effect re-runs on page change
      this.detailViewService._currentPageIndex();
      const doc = this.detailViewService.document;
      const isMap = doc?.model === DocumentTypeEnum.map || doc?.rootModel === DocumentTypeEnum.map;
      this.georeferenceService.checkPid(isMap ? this.detailViewService.currentPagePid : null);
    });

    // Reload AI panel content when page changes
    effect(() => {
      const pageIndex = this.detailViewService._currentPageIndex();
      const panelVisible = this.aiPanelService.panelVisible();
      const contentType = this.aiPanelService.contentType();

      if (panelVisible && contentType) {
        const pid = this.detailViewService.currentPagePid;
        if (pid && pid !== this.aiPanelService.currentPagePid()) {
          if (contentType === 'translation') {
            this.aiPanelService.showTranslation(pid);
          } else if (contentType === 'summary') {
            this.aiPanelService.showSummary(pid);
          } else if (contentType === 'text') {
            this.aiPanelService.showPageText(pid);
          }
        }
      }
    });

    this.articleMetadata$ = this.store.select(selectArticleDetail).pipe(
      distinctUntilChanged((prev, curr) => prev?.pid === curr?.pid),
      map(articleDetail => {
        if (articleDetail) {
          const metadata = fromSolrToMetadata(articleDetail);
          console.log('New article metadata loaded - UUID:', metadata?.uuid);
          // Return new object reference to force change detection
          return { ...metadata };
        }
        console.log('Article metadata cleared');
        return null;
      }),
      shareReplay(1)
    );
  }

  ngOnInit() {
    this.documentInfoService.reset();
    this.detailViewService.loadDocument();

    this.subscriptions.push(
      this.searchService.totalCount$.subscribe(count => {
        this.hasSearchResults.set(count > 0);
      })
    );

    // Drop map mode when the current page has no georeference
    this.subscriptions.push(
      this.georeferenceService.hasGeoreference$.subscribe(hasGeoref => {
        if (!hasGeoref && this.iiifViewerService.isMapMode()) {
          this.iiifViewerService.setMapMode(false);
        }
      })
    );

    this.subscriptions.push(
      this.detailViewService.document$.pipe(
        distinctUntilChanged((prev, curr) => prev?.uuid === curr?.uuid),
        skip(1)
      ).subscribe(() => {
        this.aiPanelService.close();
      })
    );

    // Load music tracks so the records (track list) view can be shown for sound recordings.
    // The recordings selector emits a new array on every store change, so dedupe by pid set
    // to avoid re-dispatching loadMusic (and re-firing the track API) multiple times.
    this.subscriptions.push(
      this.detailViewService.getSoundRecordings().pipe(
        filter((recordings): recordings is NonNullable<typeof recordings> => !!recordings && recordings.length > 0),
        distinctUntilChanged((prev, curr) =>
          prev.length === curr.length && prev.every((p, i) => p.pid === curr[i].pid))
      ).subscribe(recordings => {
        this.musicService.loadMusic(recordings);
      })
    );

    this.subscriptions.push(
      this.detailViewService.pages$.subscribe(pages => {
        if (pages && pages.length > 0) {
          const pageItems = pages.map(page => ({
            pid: page.pid,
            title: `${this.translate.instant('page')} ${pages.indexOf(page) + 1}`,
            model: DocumentTypeEnum.page,
            accessibility: DocumentAccessibilityEnum.PUBLIC,
            licenses: [],
            access: 'public'
          }));
          this.adminModeService.updateCurrentPageItems(pageItems);
        }
      })
    );
  }

  ngAfterViewInit(): void {
    // Register the single shared fullscreen container so the IIIF viewer,
    // viewer-controls and AI content panel all fullscreen together.
    this.detailFullscreen.registerToggle(() => this.contentFullscreen?.toggle());
  }

  ngOnDestroy(): void {
    if (this.navHeightRaf !== null) {
      cancelAnimationFrame(this.navHeightRaf);
    }
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.favoritesHelper.cleanup();
    this.detailViewService.resetState();
    this.iiifViewerService.setMapMode(false);
    this.georeferenceService.reset();
    this.documentSearchService.clearSearch();
    this.detailFullscreen.registerToggle(null);
    this.detailFullscreen.setFullscreen(false);
    this.aiPanelService.close();
    if (this.stopTtsOnLeave && this.ttsService.isReading()) {
      this.ttsService.stop();
    }
  }

  onFavoritesClicked(event: Event) {
    // Enable hierarchy selector for detail view (not for music pages)
    this.favoritesHelper.onFavoritesClicked(event, this.detailViewService.document$, true);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  get mobileNavItems(): MobileNavItem[] {
    const items = [...this.mobileNavItemsBase];
    if (this.configService.isFeatureEnabled('ai')) {
      items.push(this.mobileAiNavItem);
    }
    if (this.hasSearchResults()) {
      items.push(this.mobileSearchNavItem);
    }
    return items;
  }

  /** Viewer type for the mobile viewer-controls menu, mirroring the main-content viewer selection. */
  get currentViewerType(): 'pdf' | 'image' | 'epub' {
    if (this.detailViewService.isPdf) return 'pdf';
    if (this.detailViewService.isEpub || this.detailViewService.document?.epub) return 'epub';
    return 'image';
  }

  /** Viewer action ids surfaced in the mobile toolbar menu (see ViewerControls.getMenuItems). */
  private static readonly VIEWER_MENU_ACTION_IDS = new Set([
    'select-area', 'fullscreen', 'fit-to-screen', 'fit-to-width',
    'zoom-lock', 'scroll-mode', 'rotate', 'page-text', 'book-mode',
    // Read-aloud controls, which on compact viewports are only reachable here.
    'tts-play-pause', 'tts-stop',
  ]);

  /**
   * Routes toolbar "more"-menu selections that belong to the viewer back to the
   * hidden viewer-controls instance. Favorites/share/quote keep their own outputs.
   */
  onToolbarAction(event: { id: string }, viewerControls: ViewerControls): void {
    if (DetailViewPageComponent.VIEWER_MENU_ACTION_IDS.has(event.id)) {
      viewerControls.handleMenuAction(event.id);
    }
  }

  getMobilePanelTitle(): string {
    // The description panel's header shows the document title (next to the close button),
    // so the metadata-section inside hides its own title to avoid duplication.
    if (this.mobileActivePanel() === 'description') {
      return this.detailViewService.document?.mainTitle || '';
    }
    const item = this.mobileNavItems.find(i => i.id === this.mobileActivePanel());
    return item ? this.translate.instant(item.label) : '';
  }

  onMobileNavChange(id: string) {
    if (this.mobileActivePanel() === id && this.mobileSlideUpOpen()) {
      // Tapping the same tab closes the panel
      this.mobileSlideUpOpen.set(false);
      this.mobileActivePanel.set('');
    } else {
      // Open the panel if it's a different tab, or if panel is closed
      if (id === 'pages') {
        // Pages uses filter-sidebar slide-up
        this.mobileSlideUpOpen.set(false);
        this.mobileActivePanel.set(id);
        this.breakpointService.manualToggle.set(true);
      } else {
        this.breakpointService.manualToggle.set(false);
        this.mobileActivePanel.set(id);
        this.mobileSlideUpOpen.set(true);
      }
      // Opening a panel takes over the screen: hide the immersive nav bar.
      this.mobileNavVisible.set(false);
    }
  }

  onMobileSlideUpClosed() {
    this.mobileSlideUpOpen.set(false);
    this.mobileActivePanel.set('');
  }

  /** Toggle the immersive mobile nav bar on a clean tap on the viewer. */
  onViewerCleanTap(): void {
    this.mobileNavVisible.update(v => !v);
  }

  /**
   * Tween the --mobile-nav-bar-height custom property so the viewer's calc()
   * height animates. Uses rAF because a CSS transition can't interpolate a
   * calc() driven by a custom property. Honors prefers-reduced-motion.
   */
  private animateMobileNavBarHeight(target: number): void {
    const layout = this.hostRef.nativeElement.querySelector('app-detail-layout') as HTMLElement | null;
    if (!layout) return;

    const setVar = (px: number) => {
      this.navHeightCurrent = px;
      layout.style.setProperty('--mobile-nav-bar-height', `${px}px`);
    };

    if (this.navHeightRaf !== null) {
      cancelAnimationFrame(this.navHeightRaf);
      this.navHeightRaf = null;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const from = this.navHeightCurrent;
    // Snap instantly when motion is reduced, already there, or rAF is paused
    // (hidden tab) — otherwise the value could be stranded mid-tween.
    if (reduceMotion || from === target || document.hidden) {
      setVar(target);
      return;
    }

    const start = performance.now();
    const duration = DetailViewPageComponent.NAV_HEIGHT_ANIM_MS;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out (matches the nav bar's ease feel)
      const eased = 1 - Math.pow(1 - t, 3);
      setVar(from + (target - from) * eased);
      if (t < 1) {
        this.navHeightRaf = requestAnimationFrame(step);
      } else {
        this.navHeightRaf = null;
        setVar(target);
      }
    };
    this.navHeightRaf = requestAnimationFrame(step);
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  getIssueTypeCode(children: any[], uuid: string): string | undefined {
    return normalizeIssueTypeCode(children?.find(c => c?.pid === uuid)?.['issue.type.code']);
  }
}
