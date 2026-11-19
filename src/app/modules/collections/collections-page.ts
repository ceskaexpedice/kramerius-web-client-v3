import { METADATA_PANEL_ID } from '../../shared/components/detail-layout/metadata-panel-id';
import { Component, computed, inject, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, signal, afterNextRender, Injector, DOCUMENT } from '@angular/core';
import { FixedPanelService } from '../../shared/components/fixed-panel/fixed-panel.service';
import { InlineLoaderComponent } from '../../shared/components/inline-loader/inline-loader.component';
import { AdminModeService } from '../../shared/services/admin-mode.service';
import { CollectionsService } from '../../shared/services/collections.service';
import { SearchDocument } from '../models/search-document';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { Cutting, cuttingToRecordItem } from '../../shared/models/cutting.model';
import { ToggleOption } from '../../shared/components/toggle-button-group/toggle-button-group.component';
import { AppTranslationService } from '../../shared/translation/app-translation.service';
import { Metadata } from '../../shared/models/metadata.model';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { Subject, takeUntil } from 'rxjs';
import { UiStateService } from '../../shared/services/ui-state.service';
import { getLanguageFallbackChain } from '../../shared/translation/translation-fallback-chain';
import { resolveLocalizedValue } from '../../shared/utils/language-utils';
import { ActivatedRoute, Router } from '@angular/router';
import { MapSeriesService } from '../map-series/map-series.service';
import { APP_ROUTES_ENUM } from '../../app.routes';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';

@Component({
  selector: 'app-collections-page',
  templateUrl: './collections-page.html',
  styleUrl: './collections-page.scss',
  standalone: false
})
export class CollectionsPage implements OnInit, AfterViewInit, OnDestroy {

  public adminModeService = inject(AdminModeService);
  public collectionsService = inject(CollectionsService);
  public translationService = inject(AppTranslationService);
  public recordHandler = inject(RecordHandlerService);
  private uiStateService = inject(UiStateService);
  private mapSeriesService = inject(MapSeriesService);
  public breakpointService = inject(BreakpointService);
  readonly metadataPanelId = METADATA_PANEL_ID;
  private fixedPanel = inject(FixedPanelService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  /** "Add to my library" popup for the collection itself (#207). */
  public favoritesHelper = new FavoritesPopupHelper(inject(FavoritesService), inject(PopupPositioningService), this.router);

  private injector = inject(Injector);
  private document = inject(DOCUMENT);

  /**
   * The clamped collection description. It only exists while the collection has
   * a description (it sits inside @if blocks), so the resize observer is
   * (re)attached whenever Angular hands us a new element.
   */
  @ViewChild('descriptionElement') set descriptionElement(ref: ElementRef<HTMLElement> | undefined) {
    this.descriptionResizeObserver?.disconnect();
    this.descriptionEl = ref?.nativeElement;
    if (this.descriptionEl && typeof ResizeObserver !== 'undefined') {
      // Re-measure whenever the box changes size: first layout, viewport /
      // orientation changes, sidebar toggles, late-loading fonts that change
      // the line height.
      this.descriptionResizeObserver = new ResizeObserver(() => this.updateDescriptionTruncation());
      this.descriptionResizeObserver.observe(this.descriptionEl);
    }
    // Not during change detection (this setter runs inside it).
    afterNextRender(() => this.updateDescriptionTruncation(), { injector: this.injector });
  }
  private descriptionEl?: HTMLElement;
  private descriptionResizeObserver?: ResizeObserver;

  readonly isDescriptionExpanded = signal(false);
  readonly isDescriptionTruncated = signal(false);
  rightSidebarVisible = this.uiStateService.metadataSidebarOpen;
  /** The bottom view switch slides away with the header while the list scrolls down. */
  readonly mobileNavHidden = computed(() => this.breakpointService.isMobile() && (!this.uiStateService.headerVisible() || this.fixedPanel.anyOpen()));
  sidebarPositionMode: 'absolute' | 'relative' = 'relative'; // 'absolute' = over content, 'relative' = beside content

  private destroy$ = new Subject<void>();

  ngOnInit() {
    // Check for truncation when detail data loads
    this.collectionsService.detail$
      .pipe(takeUntil(this.destroy$))
      .subscribe(detail => {
        if (detail) {
          // A new collection starts collapsed. Measure once its description is
          // actually rendered (the element may be reused with new content and
          // the same clamped height, which the resize observer would not see),
          // and again once web fonts settle, since they change line wrapping.
          this.isDescriptionExpanded.set(false);
          afterNextRender(() => this.updateDescriptionTruncation(), { injector: this.injector });
          this.document.fonts?.ready.then(() => this.updateDescriptionTruncation());
        }
      });
  }

  ngAfterViewInit() {
  }

  ngOnDestroy() {
    this.descriptionResizeObserver?.disconnect();
    this.favoritesHelper.cleanup();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onFavoritesClicked(event: Event, metadata: Metadata | null) {
    this.favoritesHelper.onFavoritesClicked(event, metadata);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

  /**
   * Whether the clamped description hides text: compares the clamped height
   * with the height after briefly lifting the clamp (`check-height`). With
   * `line-clamp` the hidden lines do not count towards scrollHeight, so the
   * clamped element alone cannot tell. The class is added and removed in the
   * same task, so the resize observer sees no change and is not re-triggered.
   * Skipped while expanded: the clamp is off then, so both heights match and
   * the "show less" button would disappear.
   */
  private updateDescriptionTruncation(): void {
    const el = this.descriptionEl;
    if (!el) {
      this.isDescriptionTruncated.set(false);
      return;
    }
    if (this.isDescriptionExpanded()) {
      return;
    }
    const clampedHeight = el.clientHeight;
    el.classList.add('check-height');
    const fullHeight = el.scrollHeight;
    el.classList.remove('check-height');
    // 1px tolerance for sub-pixel rounding.
    this.isDescriptionTruncated.set(fullHeight > clampedHeight + 1);
  }

  toggleDescription() {
    this.isDescriptionExpanded.update(expanded => !expanded);
  }

  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  toCuttingRecordItem(cutting: Cutting): RecordItem {
    return cuttingToRecordItem(cutting);
  }

  /**
   * True when this collection is a map series, i.e. a grid overlay is
   * published for it — only those offer the sheet index view.
   */
  get isMapSeries(): boolean {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    return !!uuid && !!this.mapSeriesService.getShapefileUrl(uuid);
  }

  goToMapSeries(): void {
    const uuid = this.route.snapshot.paramMap.get('uuid');
    if (uuid) {
      this.router.navigate([APP_ROUTES_ENUM.MAP_SERIES, uuid]);
    }
  }

  /**
   * The toolbar's tab strip is hidden on phones, so map series offer the same
   * switch in the bottom nav bar — matching the sheet index view.
   */
  readonly mobileNavItems: MobileNavItem[] = [
    { id: 'documents', label: 'map-series--view-documents', icon: 'icon-grid-6' },
    { id: 'map', label: 'map-series--view-map', icon: 'icon-map' }
  ];

  /**
   * Bottom offset for the floating filter toggle when the map-series nav bar is
   * on screen: its 61px height plus a gap. The sidebar takes the larger of this
   * and its own 72px mobile default, so anything below that has no effect.
   */
  private static readonly NAV_BAR_TOGGLE_OFFSET = 85;

  filterToggleBottomOffset(): number {
    return this.isMapSeries && this.breakpointService.isMobile()
      ? CollectionsPage.NAV_BAR_TOGGLE_OFFSET
      : 0;
  }

  onMobileNavChange(id: string): void {
    if (id === 'map') {
      this.goToMapSeries();
    }
  }

  viewModeOptions: ToggleOption<'documents' | 'cuttings'>[] = [
    { value: 'documents', label: 'collection--view-documents' },
    { value: 'cuttings', label: 'collection--view-cuttings' },
  ];

  setViewMode(mode: 'documents' | 'cuttings') {
    this.collectionsService.viewMode.set(mode);
  }

  /**
   * Gets the collection description in the current language
   */
  getLocalizedDescription(metadata: Metadata): string {
    if (!metadata || !metadata.notes || metadata.notes.length === 0) return '';

    const currentLang = this.translationService.currentLanguage().code;

    // Prefer the current UI language, then walk the configured fallback chain,
    // and finally the first available note when none of those languages are present.
    for (const lang of getLanguageFallbackChain(currentLang)) {
      const note = metadata.notes.find(n => n.lang === lang);
      if (note) {
        return note.text;
      }
    }

    return metadata.notes[0].text;
  }

  /**
   * Gets the collection title in the current language
   */
  getLocalizedTitle(metadata: Metadata): string {
    if (!metadata || !metadata.collectionTitles) return metadata?.mainTitle || '';

    const currentLang = this.translationService.currentLanguage().code;
    return resolveLocalizedValue(metadata.collectionTitles, currentLang) || metadata.mainTitle || '';
  }

  onExportSelected(): void {
  }

  onEditSelected(selectedIds: string[]): void {
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.collectionsService.changeSortBy(event.value, event.direction);
  }

  showRightSidebar() {
    this.uiStateService.setMetadataSidebarState(true);
  }

  hideRightSidebar() {
    this.uiStateService.setMetadataSidebarState(false);
  }

  /** Phones: the description opens as a slide-up sheet (no floating panel there). */
  mobileInfoOpen = signal(false);

  onInfoClicked() {
    if (this.breakpointService.isMobile()) {
      this.mobileInfoOpen.set(true);
      return;
    }
    this.rightSidebarVisible() ? this.hideRightSidebar() : this.showRightSidebar();
  }
}
