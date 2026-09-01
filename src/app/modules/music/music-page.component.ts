import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ElementRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { filter, distinctUntilChanged } from 'rxjs/operators';
import { DetailViewService } from "../detail-view-page/services/detail-view.service";
import { RecordHandlerService } from "../../shared/services/record-handler.service";
import { EnvironmentService } from "../../shared/services/environment.service";
import { DocumentTypeEnum } from "../constants/document-type";
import { MusicService } from "./services/music.service";
import { SoundService } from '../../shared/services/sound.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';
import { DocumentInfoService } from '../../shared/services/document-info.service';
import { UserService } from '../../shared/services/user.service';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { SearchService } from '../../shared/services/search.service';
import { ConfigService } from '../../core/config';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { ViewerControls } from '../../shared/components/viewer-controls/viewer-controls';

@Component({
  selector: 'app-music-page',
  templateUrl: './music-page.component.html',
  styleUrl: './music-page.component.scss',
  standalone: false
})
export class MusicPageComponent implements OnInit, OnDestroy {

  private krameriusBaseUrl: string;
  private soundRecordingsSub!: Subscription;
  private searchCountSub?: Subscription;

  public detailViewService = inject(DetailViewService);
  public recordHandler = inject(RecordHandlerService);
  public musicService = inject(MusicService);
  public soundService = inject(SoundService);
  public documentInfoService = inject(DocumentInfoService);
  public userService = inject(UserService);
  public breakpointService = inject(BreakpointService);
  public searchService = inject(SearchService);
  public configService = inject(ConfigService);
  public translate = inject(TranslateService);
  private hostRef = inject(ElementRef<HTMLElement>);

  // Mobile chrome: the bottom nav bar replaces the two floating sidebar toggles
  // on phones. Its items mirror the right metadata sidebar's tabs, plus one for
  // the left records/images panel (mirrors detail-view's "pages"). Issue #172.
  mobileNavItemsBase: MobileNavItem[] = [
    { id: 'description', label: 'description', icon: 'icon-note' },
    { id: 'records', label: 'sound-records--toggle', icon: 'icon-simcard-2' },
  ];
  mobileExportNavItem: MobileNavItem = { id: 'export', label: 'export', icon: 'icon-download' };
  mobileSearchNavItem: MobileNavItem = { id: 'results', label: 'results', icon: 'icon-receipt-search' };
  hasSearchResults = signal(false);
  mobileActivePanel = signal<string>('');
  mobileSlideUpOpen = signal(false);

  // Immersive mobile chrome, as on detail-view: the nav bar hides so the image
  // fills the screen and a clean tap on the viewer brings it back. Only in
  // "images" mode - the records track list has no viewer to tap, so an
  // auto-hidden bar would be unreachable there (GitHub issue #172).
  mobileNavVisible = signal(false);
  isImmersiveMode = computed(() => this.detailViewService.soundRecordingViewMode() === 'images');
  /** The bar is always shown outside immersive mode; inside it, tap decides. */
  mobileNavShown = computed(() => !this.isImmersiveMode() || this.mobileNavVisible());
  // Reserved height (px) the visible nav bar takes from the viewer.
  private static readonly MOBILE_NAV_BAR_HEIGHT = 60;
  private static readonly NAV_HEIGHT_ANIM_MS = 250;
  private navHeightRaf: number | null = null;
  private navHeightCurrent = 0;

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  constructor(
    private envService: EnvironmentService,
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    this.krameriusBaseUrl = this.envService.getKrameriusUrl();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);

    // Animate the reserved nav-bar height so the viewer grows/shrinks smoothly
    // when the immersive bar shows/hides. Driven in JS because a CSS transition
    // cannot interpolate a calc() height that changes via a custom property.
    effect(() => {
      const target = this.breakpointService.isMobile() && this.mobileNavShown()
        ? MusicPageComponent.MOBILE_NAV_BAR_HEIGHT
        : 0;
      this.animateMobileNavBarHeight(target);
    });

    // The left panel can also be dismissed by its own drag handle or backdrop,
    // which bypasses onMobileNavChange - clear the highlight so the nav bar
    // doesn't keep showing "records" as active.
    effect(() => {
      if (!this.breakpointService.manualToggle() && this.mobileActivePanel() === 'records') {
        this.mobileActivePanel.set('');
      }
    });
  }

  ngOnInit() {
    this.documentInfoService.reset();
    this.detailViewService.loadDocument();
    this.detailViewService.loadPages();

    this.searchCountSub = this.searchService.totalCount$.subscribe(count => {
      this.hasSearchResults.set(count > 0);
    });

    // The recordings selector emits a new array on every store change, so dedupe by pid set
    // to avoid re-dispatching loadMusic (and re-firing the track API) multiple times.
    this.soundRecordingsSub = this.detailViewService.getSoundRecordings()
      .pipe(
        filter((recordings): recordings is NonNullable<typeof recordings> => !!recordings && recordings.length > 0),
        distinctUntilChanged((prev, curr) =>
          prev.length === curr.length && prev.every((p, i) => p.pid === curr[i].pid))
      )
      .subscribe(recordings => {
        this.musicService.loadMusic(recordings);
      });

  }

  ngOnDestroy(): void {
    this.soundRecordingsSub?.unsubscribe();
    this.searchCountSub?.unsubscribe();
    if (this.navHeightRaf !== null) {
      cancelAnimationFrame(this.navHeightRaf);
      this.navHeightRaf = null;
    }
    this.favoritesHelper.cleanup();
    this.detailViewService.resetState();
  }

  onFavoritesClicked(event: Event) {
    // Do not show hierarchy selector for music page
    this.favoritesHelper.onFavoritesClicked(event, this.detailViewService.document$, false);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

  isAccessDenied(document: any): boolean {
    return !this.recordHandler.isRecordPublic(document.licences)
      && !this.documentInfoService.canAccessDocument()
      && !this.userService.hasAnyLicense(document.licences);
  }

  scrollToAccessDenied(): void {
    document.getElementById('music-access-denied-section')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /**
   * Nav items mirror the right metadata sidebar's tabs, gated by the same
   * conditions it uses, so the bar never offers an empty panel. "records" is
   * always present - it opens the left panel, which always has content.
   */
  get mobileNavItems(): MobileNavItem[] {
    const items = [...this.mobileNavItemsBase];
    if (this.configService.isAnyExportFormatEnabled()) {
      items.push(this.mobileExportNavItem);
    }
    if (this.hasSearchResults()) {
      items.push(this.mobileSearchNavItem);
    }
    return items;
  }

  getMobilePanelTitle(): string {
    // The description panel's header already shows the document title, so the
    // metadata-section inside hides its own to avoid printing it twice.
    if (this.mobileActivePanel() === 'description') {
      return this.detailViewService.document?.mainTitle || '';
    }
    const item = this.mobileNavItems.find(i => i.id === this.mobileActivePanel());
    return item ? this.translate.instant(item.label) : '';
  }

  onMobileNavChange(id: string) {
    if (this.mobileActivePanel() === id && (this.mobileSlideUpOpen() || this.breakpointService.manualToggle())) {
      // Tapping the active tab closes whichever panel it opened.
      this.mobileSlideUpOpen.set(false);
      this.breakpointService.manualToggle.set(false);
      this.mobileActivePanel.set('');
      return;
    }
    if (id === 'records') {
      // Records/images live in the left filter-sidebar, which brings its own slide-up.
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

  onMobileSlideUpClosed() {
    this.mobileSlideUpOpen.set(false);
    this.mobileActivePanel.set('');
  }

  /** Toggle the immersive mobile nav bar on a clean tap on the viewer. */
  onViewerCleanTap(): void {
    if (!this.isImmersiveMode()) return;
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
    // (hidden tab) - otherwise the value could be stranded mid-tween.
    if (reduceMotion || from === target || document.hidden) {
      setVar(target);
      return;
    }

    const start = performance.now();
    const duration = MusicPageComponent.NAV_HEIGHT_ANIM_MS;
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

  private static readonly VIEWER_MENU_ACTION_IDS = new Set([
    'select-area', 'fullscreen', 'fit-to-screen', 'fit-to-width',
    'zoom-lock', 'scroll-mode', 'rotate', 'page-text', 'book-mode',
    'tts-play-pause', 'tts-stop',
  ]);

  /**
   * Routes toolbar "more"-menu selections that belong to the viewer back to the
   * hidden viewer-controls instance, mirroring detail-view (GitHub issue #172).
   */
  onToolbarAction(event: { id: string }, viewerControls: ViewerControls): void {
    if (MusicPageComponent.VIEWER_MENU_ACTION_IDS.has(event.id)) {
      viewerControls.handleMenuAction(event.id);
    }
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

}
