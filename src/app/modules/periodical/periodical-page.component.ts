import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
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

  // Mobile right-panel state (bottom nav bar + slide-up panel).
  private static readonly MOBILE_DATE_BAR_HEIGHT = 48;
  // Height of the collapsed peek band (mirrors --slide-up-peek-height), used to
  // lift the filter toggle button clear of the peeking panel.
  private static readonly MOBILE_PEEK_BAND_HEIGHT = 56;
  // Gap between the peek band's top edge and the lifted toggle button.
  private static readonly FILTER_TOGGLE_GAP = 12;
  public hasSearchResults = signal(false);
  public mobileActivePanel = signal<string>('');
  public mobileSlideUpOpen = signal(false);

  private subscriptions: Subscription[] = [];
  public showMetadataSidebar = this.uiStateService.metadataSidebarOpen;
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

    // Mobile: tabs appear in the bottom nav only when there are search results.
    this.subscriptions.push(
      this.searchService.totalCount$.subscribe(count => {
        this.hasSearchResults.set((count || 0) > 0);
        if ((count || 0) === 0 && this.mobileActivePanel() === 'results') {
          // The results tab vanished — collapse it.
          this.mobileActivePanel.set('');
          this.mobileSlideUpOpen.set(false);
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
            title: child['date.str'] || `${child['date_range_end.day']}.${child['date_range_end.month']}`,
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

  openRecordInfo() {
    this.toggleMetadataSidebar();
  }

  toggleMetadataSidebar() {
    this.uiStateService.toggleMetadataSidebar();
  }

  private mobileNavItemsBase: MobileNavItem[] = [
    { id: 'description', label: 'description', icon: 'icon-note' },
  ];
  private mobileResultsNavItem: MobileNavItem = { id: 'results', label: 'results', icon: 'icon-receipt-search' };

  get mobileNavItems(): MobileNavItem[] {
    const items = [...this.mobileNavItemsBase];
    if (this.hasSearchResults()) {
      items.push(this.mobileResultsNavItem);
    }
    return items;
  }

  /** Mode A (nav bar) when there are 2+ tabs; Mode B (peek panel) otherwise. */
  get hasMobileTabs(): boolean {
    return this.hasSearchResults();
  }

  /** Peek sits above the fixed date bar when a year is selected. */
  get mobilePeekOffset(): number {
    return this.periodical.selectedYear() ? PeriodicalPageComponent.MOBILE_DATE_BAR_HEIGHT : 0;
  }

  /**
   * Extra bottom offset for the filter-sidebar toggle button so it clears the
   * peeking slide-up panel (Mode B). The button's own base bottom acts as the gap.
   */
  get filterToggleBottomOffset(): number {
    // Only Mode B renders a peeking panel that overlaps the toggle. Mode A shows a
    // (non-fixed) nav bar, and with no metadata / in admin mode no panel renders.
    const peekPanelShown = !!this.periodical.metadata && !this.adminModeService.adminMode() && !this.hasMobileTabs;
    if (!peekPanelShown) {
      return 0;
    }
    // Target the button's bottom just above the peek band's top edge
    // (band spans [peekOffset, peekOffset + bandHeight]) with a small gap.
    return this.mobilePeekOffset
      + PeriodicalPageComponent.MOBILE_PEEK_BAND_HEIGHT
      + PeriodicalPageComponent.FILTER_TOGGLE_GAP;
  }

  getMobilePanelTitle(): string {
    // The description panel's header shows the document title (next to the close button),
    // so the metadata-section inside hides its own title to avoid duplication.
    if (this.mobileActivePanel() === 'description') {
      return this.periodical.metadata?.mainTitle || '';
    }
    const item = this.mobileNavItems.find(i => i.id === this.mobileActivePanel());
    return item ? this.translate.instant(item.label) : (this.periodical.metadata?.mainTitle || '');
  }

  onMobileNavChange(id: string): void {
    if (this.mobileActivePanel() === id && this.mobileSlideUpOpen()) {
      this.mobileSlideUpOpen.set(false);
      this.mobileActivePanel.set('');
    } else {
      this.mobileActivePanel.set(id);
      this.mobileSlideUpOpen.set(true);
    }
  }

  onMobileSlideUpClosed(): void {
    this.mobileSlideUpOpen.set(false);
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
