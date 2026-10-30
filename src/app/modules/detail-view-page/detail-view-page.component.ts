import { Component, effect, untracked, inject, OnInit, OnDestroy, AfterViewInit, signal, HostBinding, computed, ViewChild, ElementRef } from '@angular/core';
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
import { PANEL_TABS } from '../../shared/components/metadata-sidebar/panel-tabs';
import { AdminActionsService } from '../../shared/services/admin-actions.service';
import { GeoreferenceService } from '../../shared/services/georeference.service';
import { ConfigService } from '../../core/config/config.service';
import { MapViewerService } from '../../shared/services/map-viewer.service';
import { DetailFullscreenService } from '../../shared/services/detail-fullscreen.service';
import { FullscreenComponent } from '../../shared/components/fullscreen/fullscreen.component';
import { MusicService } from '../music/services/music.service';
import { SoundService } from '../../shared/services/sound.service';
import { ViewerControls } from '../../shared/components/viewer-controls/viewer-controls';

import { PeriodicalNeighborsService } from '../../shared/services/periodical-neighbors.service';
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
  private periodicalNeighbors = inject(PeriodicalNeighborsService);
  public soundService = inject(SoundService);

  @HostBinding('style.--license-bar-offset')
  get licenseBarOffset() { return this.uiState.licenseBarVisible() ? 'var(--license-bar-height)' : '0px'; }

  // TODO: set to false to keep TTS playing when navigating away
  private readonly stopTtsOnLeave = true;

  // Mobile nav bar
  // Labels/icons come from the shared panel-tab config so mobile and desktop match.
  mobileNavItemsBase: MobileNavItem[] = [
    { id: 'description', label: PANEL_TABS.description.label, icon: PANEL_TABS.description.icon },
    { id: 'pages', label: PANEL_TABS.pages.label, icon: PANEL_TABS.pages.icon },
    { id: 'export', label: PANEL_TABS.export.label, icon: PANEL_TABS.export.icon },
  ];
  mobileSearchNavItem: MobileNavItem = { id: 'results', label: PANEL_TABS.search.label, icon: PANEL_TABS.search.icon };
  mobileAiNavItem: MobileNavItem = { id: 'ai', label: PANEL_TABS.ai.label, icon: PANEL_TABS.ai.icon };
  hasSearchResults = signal(false);
  mobileActivePanel = signal<string>('');
  mobileSectionOpen = signal(false);
  /** A section panel or the pages panel is open; the nav bar must stay up then. */
  readonly mobilePanelOpen = computed(() =>
    this.mobileSectionOpen() || (this.mobileActivePanel() === 'pages' && this.breakpointService.manualToggle()));

  // Immersive mobile chrome: the bottom nav bar is hidden by default and
  // toggled by a clean tap on the viewer (see ViewerTapToggleDirective). While
  // a section panel is open it stays up, docked under the panel.
  mobileNavVisible = signal(false);
  // Immersive mode gives no hint that a tap reveals the bar. Until the reader
  // has used the bar once (MOBILE_NAV_LEARNED_KEY), it stays up after a
  // document opens and only tucks away when they start panning/zooming the
  // scan, so a 3 s timer can't hide it while the first image is still loading.
  // Afterwards each newly opened document shows it briefly as before.
  private static readonly MOBILE_NAV_PEEK_MS = 3000;
  private static readonly MOBILE_NAV_LEARNED_KEY = 'reader-nav-learned';
  private mobileNavPeekTimer: ReturnType<typeof setTimeout> | null = null;
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
      // Only phones have the bottom nav bar; elsewhere it reserves nothing.
      const target = this.mobileNavVisible() && this.breakpointService.isMobile() ? DetailViewPageComponent.MOBILE_NAV_BAR_HEIGHT : 0;
      this.animateMobileNavBarHeight(target);
    });

    // Immersive reading on phones: with the nav bar hidden, the global header
    // hides too (body.reader-immersive) so the scan gets the whole screen.
    // An open panel keeps the chrome up (it docks between header and nav).
    effect(() => {
      this.uiState.setImmersive(this.breakpointService.isMobile() && !this.mobileNavVisible() && !this.mobilePanelOpen());
    });

    // The pages panel (left filter-sidebar) was closed: bring the nav back.
    effect(() => {
      const leftOpen = this.breakpointService.manualToggle();
      if (!leftOpen && untracked(() => this.mobileActivePanel() === 'pages')) {
        this.mobileActivePanel.set('');
        this.mobileNavVisible.set(true);
      }
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
            // Re-check the licence on every page turn: the panel stays open while the
            // reader pages through the document, so a transcript opened on a permitted
            // page must not follow them onto one whose licence denies `text`.
            if (this.detailViewService.isActionAllowed('text')) {
              this.aiPanelService.showPageText(pid);
            } else {
              this.aiPanelService.close();
            }
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

    this.subscriptions.push(
      this.detailViewService.document$.pipe(
        filter(doc => !!doc?.uuid),
        distinctUntilChanged((prev, curr) => prev?.uuid === curr?.uuid)
      ).subscribe(() => this.peekMobileNav())
    );

    // Next documents on the reused page (the first one loads via loadDocument()).
    this.subscriptions.push(
      this.detailViewService.document$.pipe(
        filter(doc => !!doc?.uuid),
        distinctUntilChanged((prev, curr) => prev?.uuid === curr?.uuid),
        skip(1)
      ).subscribe(doc => this.detailViewService.syncPeriodicalChildren(doc))
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
    // The constructor effect ran before app-detail-layout existed; apply the
    // initial nav-bar reservation now that it does.
    const target = this.mobileNavVisible() && this.breakpointService.isMobile() ? DetailViewPageComponent.MOBILE_NAV_BAR_HEIGHT : 0;
    this.navHeightCurrent = target; // equal → animate…() snaps instead of tweening
    this.animateMobileNavBarHeight(target);
  }

  ngOnDestroy(): void {
    this.cancelMobileNavPeek();
    this.uiState.setImmersive(false);
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

  /** Mobile nav item of the open section (panel header icon + caption). */
  get mobileActiveNavItem(): MobileNavItem | null {
    return this.mobileNavItems.find(i => i.id === this.mobileActivePanel()) ?? null;
  }

  getMobilePanelTitle(): string {
    if (this.mobileActivePanel() === 'description') {
      return this.detailViewService.document?.mainTitle || '';
    }
    const item = this.mobileActiveNavItem;
    return this.translate.instant(item ? item.label : 'metadata-panel--label');
  }

  /**
   * Bottom nav tap. The nav stays visible while a section panel is open and is
   * the only section switcher (the panel header carries just the caption and
   * close), so tapping another item swaps the content in place and tapping the
   * active one closes it.
   */
  onMobileNavChange(id: string) {
    this.cancelMobileNavPeek();
    this.markMobileNavLearned();
    const pagesOpen = this.breakpointService.manualToggle();
    if (this.mobileActivePanel() === id && (this.mobileSectionOpen() || (id === 'pages' && pagesOpen))) {
      if (id === 'pages') {
        this.breakpointService.manualToggle.set(false);
      } else {
        this.mobileSectionOpen.set(false);
      }
      this.mobileActivePanel.set('');
      return;
    }
    if (id === 'pages') {
      // Pages uses the filter-sidebar panel. Closing the section panel through
      // its model emits no (closed), so the switch keeps the state set here.
      this.mobileSectionOpen.set(false);
      this.mobileActivePanel.set(id);
      this.breakpointService.manualToggle.set(true);
    } else {
      this.breakpointService.manualToggle.set(false);
      this.mobileActivePanel.set(id);
      this.mobileSectionOpen.set(true);
    }
    this.mobileNavVisible.set(true);
  }

  /** Section panel dismissed (its close button or Escape): no section active. */
  onMobileSectionClosed() {
    this.mobileSectionOpen.set(false);
    this.mobileActivePanel.set('');
    this.mobileNavVisible.set(true);
  }

  /** Page pill ‹ ›: using it means the reader found the nav, so stop the auto-hide. */
  onPagePill(direction: 'prev' | 'next'): void {
    this.cancelMobileNavPeek();
    this.markMobileNavLearned();
    if (direction === 'prev') {
      this.detailViewService.goToPrevious();
    } else {
      this.detailViewService.goToNext();
    }
  }

  /** Mobile page pill (‹ n / N ›) above the bottom nav; hidden while a panel covers the viewer. */
  get showMobilePagePill(): boolean {
    return this.breakpointService.isMobile() && this.mobileNavVisible() && !this.mobilePanelOpen()
      && this.detailViewService.totalPages > 1;
  }

  /**
   * Tablet / narrow-window pill (‹ n / N ›) at the bottom of the viewer. Between
   * phone and TabletMD the pages sidebar - the only other page navigation -
   * is collapsed, which left touch readers no visible way to turn a page.
   * Hidden while the pages sidebar or the metadata overlay is open (both carry
   * their own controls / would cover it) and in AI-only mode.
   */
  get showTabletPagePill(): boolean {
    return !this.breakpointService.isMobile()
      && !this.breakpointService.isVisible()
      && !(this.breakpointService.rightSidebarOverlaysContent() && this.detailViewService.metadataSidebarVisible)
      && !(this.aiPanelService.panelVisible() && this.aiPanelService.effectivePanelMode() === 'ai-only')
      && this.detailViewService.totalPages > 1;
  }

  onTabletPagePill(direction: 'prev' | 'next'): void {
    if (direction === 'prev') {
      this.detailViewService.goToPrevious();
    } else {
      this.detailViewService.goToNext();
    }
  }

  /** Toggle the immersive mobile nav bar on a clean tap on the viewer. */
  onViewerCleanTap(): void {
    // The reader took over: their tap decides, the pending auto-hide doesn't.
    this.cancelMobileNavPeek();
    this.markMobileNavLearned();
    if (this.mobilePanelOpen()) return;
    this.mobileNavVisible.update(v => !v);
  }

  /** The reader started panning/zooming: the first-visit bar makes way for the scan. */
  onViewerGestureStart(): void {
    if (!this.breakpointService.isMobile() || this.mobilePanelOpen() || !this.mobileNavVisible()) return;
    // Only the automatic peek yields to a gesture; a bar the reader opened stays.
    if (this.mobileNavPeekTimer === null && this.isMobileNavLearned()) return;
    this.cancelMobileNavPeek();
    this.mobileNavVisible.set(false);
  }

  private isMobileNavLearned(): boolean {
    try {
      return localStorage.getItem(DetailViewPageComponent.MOBILE_NAV_LEARNED_KEY) === '1';
    } catch {
      return true; // storage blocked: fall back to the short peek
    }
  }

  private markMobileNavLearned(): void {
    try {
      localStorage.setItem(DetailViewPageComponent.MOBILE_NAV_LEARNED_KEY, '1');
    } catch { /* storage blocked: nothing to remember */ }
  }

  /** Show the immersive bar for a moment so readers learn it exists. */
  private peekMobileNav(): void {
    if (!this.breakpointService.isMobile() || this.mobilePanelOpen()) return;
    this.cancelMobileNavPeek();
    this.mobileNavVisible.set(true);
    // First visits: no timer, the bar waits for the reader (see onViewerGestureStart).
    if (!this.isMobileNavLearned()) return;
    this.mobileNavPeekTimer = setTimeout(() => {
      this.mobileNavPeekTimer = null;
      if (this.mobilePanelOpen()) return;
      this.mobileNavVisible.set(false);
    }, DetailViewPageComponent.MOBILE_NAV_PEEK_MS);
  }

  private cancelMobileNavPeek(): void {
    if (this.mobileNavPeekTimer !== null) {
      clearTimeout(this.mobileNavPeekTimer);
      this.mobileNavPeekTimer = null;
    }
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

  // Georeferencer editor link (admins only). URL and host are hardcoded for now.
  // The link goes through the georeferencer's login endpoint, which shares the
  // client's Keycloak, so a logged-in user lands in the editor already signed in.
  private static readonly GEOREFERENCER_LOGIN_URL = 'https://georeference-api.trinera-apps.mzk.cz/auth/login';
  private static readonly GEOREFERENCER_URL = 'https://georeference-editor.trinera-apps.mzk.cz/images';
  private static readonly GEOREFERENCER_HOST = 'kramerius.mzk.cz';

  /**
   * Link to the georeferencer editor, or null when it should not be shown.
   * A map document links its own uuid; otherwise a map page inside a non-map
   * document links the page uuid.
   */
  get georeferencerUrl(): string | null {
    if (!this.userService.isAdmin) {
      return null;
    }
    const doc = this.detailViewService.document;
    let uuid: string | null | undefined = null;
    if (doc?.model === DocumentTypeEnum.map) {
      uuid = doc.uuid;
    } else if (this.detailViewService.getCurrentPage()?.model === DocumentTypeEnum.map) {
      uuid = this.detailViewService.currentPagePid;
    }
    if (!uuid) {
      return null;
    }
    const editorParams = new URLSearchParams({ uuid, host: DetailViewPageComponent.GEOREFERENCER_HOST });
    const returnTo = `${DetailViewPageComponent.GEOREFERENCER_URL}?${editorParams}`;
    return `${DetailViewPageComponent.GEOREFERENCER_LOGIN_URL}?${new URLSearchParams({ returnTo })}`;
  }

  /** "Previous issue: 14. 3. 1902 · Issue 11" — the bare label until the neighbour is known (#200). */
  issueTooltip(direction: 'previous' | 'next'): string {
    const label = this.translate.instant(`${direction}-issue--tooltip`);
    const detail = this.periodicalNeighbors.describe(this.periodicalNeighbors.neighbors()[direction]);
    return detail ? `${label}: ${detail}` : label;
  }

  getIssueTypeCode(children: any[], uuid: string): string | undefined {
    return normalizeIssueTypeCode(children?.find(c => c?.pid === uuid)?.['issue.type.code']);
  }
}
