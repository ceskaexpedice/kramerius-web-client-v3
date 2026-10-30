import { METADATA_PANEL_ID } from '../../shared/components/detail-layout/metadata-panel-id';
import { Component, computed, effect, ElementRef, inject, OnDestroy, OnInit, signal, viewChild } from '@angular/core';
import { PANEL_TABS } from '../../shared/components/metadata-sidebar/panel-tabs';
import { ViewMode } from './models/view-mode.enum';
import { RecordInfoService } from '../../shared/services/record-info.service';
import { PeriodicalService } from '../../shared/services/periodical.service';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { Subscription } from 'rxjs';
import { DocumentTypeEnum } from '../constants/document-type';
import { DocumentAccessibilityEnum } from '../constants/document-accessibility';
import { AdminModeService } from '../../shared/services';
import { ViewToggleOption } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';
import { UiStateService } from '../../shared/services/ui-state.service';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { SearchService } from '../../shared/services/search.service';
import { TranslateService } from '@ngx-translate/core';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';
import { formatIssueDateLabel } from '../../shared/utils/periodical-date';

@Component({
  selector: 'app-periodical-view-page',
  standalone: false,
  templateUrl: './periodical-page.component.html',
  styleUrl: './periodical-page.component.scss'
})
export class PeriodicalPageComponent implements OnInit, OnDestroy {
  public periodical = inject(PeriodicalService);
  public recordInfoService = inject(RecordInfoService);
  public recordHandler = inject(RecordHandlerService);
  public adminModeService = inject(AdminModeService);
  public breakpointService = inject(BreakpointService);
  private uiStateService = inject(UiStateService);
  private searchService = inject(SearchService);
  private translate = inject(TranslateService);

  // Mobile right-panel state (bottom nav bar + fixed panel).
  private static readonly MOBILE_NAV_BAR_HEIGHT = 60;
  // Gap between a bottom bar's top edge and the floating filter button.
  private static readonly FILTER_TOGGLE_GAP = 12;
  public hasSearchResults = signal(false);
  public mobileActivePanel = signal<string>('');
  public mobileSectionOpen = signal(false);

  /**
   * Below this content width (CSS px, before the UI zoom, like the controls
   * themselves) the full desktop row no longer fits: right controls ~570px,
   * year ~140px centred, and the title keeps ~180px.
   */
  private static readonly FULL_TOOLBAR_MIN_WIDTH = 960;

  private pageContent = viewChild('pageContent', { read: ElementRef });
  private pageContentWidth = signal(Number.POSITIVE_INFINITY);

  // The toolbar spans the content column, not the viewport, so a breakpoint
  // alone misses e.g. a 1100px window minus the filter sidebar.
  private observePageContentWidth = effect(onCleanup => {
    const el: HTMLElement | undefined = this.pageContent()?.nativeElement;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(([entry]) => this.pageContentWidth.set(entry.contentRect.width));
    observer.observe(el);
    onCleanup(() => observer.disconnect());
  });

  /**
   * Phones, small tablets (≤853px) and any content column too narrow for the
   * full row: title + "more" menu in the toolbar, view toggle / year / sort in
   * a sub-toolbar. The full desktop row overlaps itself there.
   */
  public compactToolbar = computed(() => this.breakpointService.isMobile()
    || !this.breakpointService.sidebarVisible()
    || this.pageContentWidth() < PeriodicalPageComponent.FULL_TOOLBAR_MIN_WIDTH);

  private subscriptions: Subscription[] = [];
  public showMetadataSidebar = this.uiStateService.metadataSidebarOpen;
  readonly metadataPanelId = METADATA_PANEL_ID;
  sidebarPositionMode: 'absolute' | 'relative' = 'relative'; // 'absolute' = over content, 'relative' = beside content

  // Favorites popup helper
  public favoritesHelper: FavoritesPopupHelper;

  protected readonly ViewMode = ViewMode;

  // View toggle options - dynamic based on current view mode
  readonly viewToggleOptions = computed<ViewToggleOption[]>(() => {
    const viewMode = this.periodical.viewMode();
    if (viewMode === ViewMode.Timeline || viewMode === ViewMode.GridYears) {
      // Years view: timeline or grid
      return [
        { label: 'layout--timeline', icon: 'icon-settings-6', value: 'timeline' },
        { label: 'layout--grid', icon: 'icon-grid-1', value: 'grid' }
      ];
    } else {
      // Issues view: show calendar only when items have day+month data
      if (!this.periodical.canShowCalendar()) {
        return [
          { label: 'layout--cards', icon: 'icon-element-3', value: 'cards' }
        ];
      }
      return [
        { label: 'layout--calendar', icon: 'icon-calendar-1', value: 'calendar' },
        { label: 'layout--cards', icon: 'icon-element-3', value: 'cards' }
      ];
    }
  });

  constructor(
    favoritesService: FavoritesService,
    popupPositioning: PopupPositioningService,
    router: Router
  ) {
    //this.periodical.watchRouteParams();
    this.favoritesHelper = new FavoritesPopupHelper(favoritesService, popupPositioning, router);
  }

  ngOnInit(): void {
    // Set up admin selection service to track current page items for search results
    this.subscriptions.push(
      this.periodical.searchResults$.subscribe(searchResults => {
        if (searchResults && this.periodical.viewMode() === ViewMode.SearchResults) {
          this.adminModeService.updateCurrentPageItems(searchResults);
        }
      })
    );

    // Mobile: the "results" nav item appears only when there are search results.
    this.subscriptions.push(
      this.searchService.totalCount$.subscribe(count => {
        this.hasSearchResults.set((count || 0) > 0);
        if ((count || 0) === 0 && this.mobileActivePanel() === 'results') {
          // The results tab vanished — collapse it.
          this.mobileActivePanel.set('');
          this.mobileSectionOpen.set(false);
        }
      })
    );

    // track available years for years grid view
    this.subscriptions.push(
      this.periodical.availableYears$.subscribe(years => {
        if (years && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemYear[] to SearchDocument format that AdminModeService expects
          const yearItems = years.map(year => ({
            pid: year.pid,
            title: year.year,
            model: year.model as DocumentTypeEnum,
            accessibility: year.accessibility,
            licenses: year.licenses,
            access: 'public' // Default access for periodical years
          }));
          this.adminModeService.updateCurrentPageItems(yearItems);
        }
      })
    );

    // Track periodical children (issues) for year-issues-grid view
    this.subscriptions.push(
      this.periodical.periodicalChildren$.subscribe(children => {
        if (children && children.length > 0 && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemChild[] to SearchDocument format that AdminModeService expects
          const childrenItems = children.map(child => ({
            pid: child.pid,
            title: child['date.str'] || formatIssueDateLabel(child),
            model: child.model as DocumentTypeEnum,
            accessibility: child.licenses?.length ? DocumentAccessibilityEnum.PRIVATE : DocumentAccessibilityEnum.PUBLIC,
            licenses: child['licenses.facet'] || child.licenses || [],
            access: 'public' // Default access for periodical children
          }));
          this.adminModeService.updateCurrentPageItems(childrenItems);
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.favoritesHelper.cleanup();
  }

  /**
   * Whether the toolbar title navigates to the root periodical.
   *
   * On a volume/issue it always does — that is a step up the hierarchy. On the root
   * periodical itself the link would point at the current page, so it is offered only
   * in search-results mode, where following it drops the fulltext query and returns
   * the user to browsing the volumes.
   */
  isTitleClickable(document: { uuid?: string; 'root.pid'?: string } | null, mode: ViewMode): boolean {
    const rootPid = document?.['root.pid'];
    if (!rootPid) {
      return false;
    }
    return document?.uuid !== rootPid || mode === ViewMode.SearchResults;
  }

  toggleMetadataSidebar() {
    this.uiStateService.toggleMetadataSidebar();
  }

  private mobileNavItemsBase: MobileNavItem[] = [
    { id: 'description', label: PANEL_TABS.description.label, icon: PANEL_TABS.description.icon },
  ];
  private mobileResultsNavItem: MobileNavItem = { id: 'results', label: PANEL_TABS.search.label, icon: PANEL_TABS.search.icon };

  get mobileNavItems(): MobileNavItem[] {
    const items = [...this.mobileNavItemsBase];
    if (this.hasSearchResults()) {
      items.push(this.mobileResultsNavItem);
    }
    return items;
  }

  /**
   * The bottom nav bar only switches sections, so it shows with 2+ of them
   * (description + search results). With the description alone it would be a
   * lone tab: the description opens from the toolbar "more" menu > Info instead.
   */
  get hasMobileNav(): boolean {
    return this.mobileNavItems.length > 1;
  }

  /**
   * The bottom nav bar slides away together with the header while the list
   * scrolls down (same as search results) and returns on scroll up. It stays
   * while a section panel is open, since it switches the panel's sections.
   */
  readonly mobileNavHidden = computed(() =>
    this.breakpointService.isMobile() && !this.uiStateService.headerVisible() && !this.mobileSectionOpen());

  /** Height of the visible fixed bottom nav bar on phones, else 0. */
  private get mobileNavBarHeight(): number {
    return this.breakpointService.isMobile() && this.periodical.metadata
      && !this.adminModeService.adminMode() && this.hasMobileNav && !this.mobileNavHidden()
      ? PeriodicalPageComponent.MOBILE_NAV_BAR_HEIGHT : 0;
  }

  /**
   * Lifts the floating filter button above the nav bar on phones; without one
   * (admin mode, or scrolled away) it rests at its default 12px.
   */
  get filterToggleBottomOffset(): number {
    if (!this.breakpointService.isMobile()) {
      return 0;
    }
    const bar = this.mobileNavBarHeight;
    return bar > 0 ? bar + PeriodicalPageComponent.FILTER_TOGGLE_GAP : 0;
  }

  /** Toolbar "more" menu > Info, for when there is no nav bar to open the description. */
  openMobileInfo(): void {
    this.breakpointService.manualToggle.set(false);
    this.mobileActivePanel.set('description');
    this.mobileSectionOpen.set(true);
  }

  /** Accessible name of the section panel. */
  getMobilePanelTitle(): string {
    if (this.mobileActivePanel() === 'description') {
      return this.periodical.metadata?.mainTitle || '';
    }
    const item = this.mobileNavItems.find(i => i.id === this.mobileActivePanel());
    return item ? this.translate.instant(item.label) : (this.periodical.metadata?.mainTitle || '');
  }

  onMobileNavChange(id: string): void {
    if (this.mobileActivePanel() === id && this.mobileSectionOpen()) {
      this.mobileSectionOpen.set(false);
      this.mobileActivePanel.set('');
    } else {
      // A section panel never stacks on top of the open filter panel.
      this.breakpointService.manualToggle.set(false);
      this.mobileActivePanel.set(id);
      this.mobileSectionOpen.set(true);
    }
  }

  /** Section panel dismissed (its close button or Escape): no section active. */
  onMobileSectionClosed(): void {
    this.mobileSectionOpen.set(false);
    this.mobileActivePanel.set('');
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.periodical.changeSortBy(event.value, event.direction);
  }

  toggleSelectionMode(): void {
    if (this.periodical.viewMode() === ViewMode.Timeline) {
      this.periodical.setView(ViewMode.GridYears)
    } else if (this.periodical.viewMode() === ViewMode.Calendar) {
      this.periodical.setView(ViewMode.GridIssues);
    }
    this.adminModeService.toggle();
  }

  onExportSelected(): void {
  }

  onEditSelected(selectedIds: string[]): void {
  }

  onFavoritesClicked(event: Event) {
    // Enable hierarchy selector for periodical page
    this.favoritesHelper.onFavoritesClicked(event, this.periodical.metadata, true);
  }

  onFavoritesPopupClose() {
    this.favoritesHelper.onFavoritesPopupClose();
  }

}
