import { Component, computed, inject, OnDestroy, OnInit } from '@angular/core';
import { ViewMode } from './models/view-mode.enum';
import { RecordInfoService } from '../../shared/services/record-info.service';
import { PeriodicalService } from '../../shared/services/periodical.service';
import { RecordHandlerService } from '../../shared/services/record-handler.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { Subscription } from 'rxjs';
import { DocumentTypeEnum } from '../constants/document-type';
import { DocumentAccessibilityEnum } from '../constants/document-accessibility';
import { SelectionService } from '../../shared/services';
import { ViewToggleOption } from '../../shared/components/toolbar-controls/toolbar-controls.component';
import { FavoritesService } from '../../shared/services/favorites.service';
import { PopupPositioningService } from '../../shared/services/popup-positioning.service';
import { Router } from '@angular/router';
import { FavoritesPopupHelper } from '../../shared/helpers/favorites-popup.helper';
import { UiStateService } from '../../shared/services/ui-state.service';

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
  public selectionService = inject(SelectionService);
  private uiStateService = inject(UiStateService);

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
          this.selectionService.updateCurrentPageItems(searchResults);
        }
      })
    );

    // track available years for years grid view
    this.subscriptions.push(
      this.periodical.availableYears$.subscribe(years => {
        if (years && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemYear[] to SearchDocument format that AdminSelectionService expects
          const yearItems = years.map(year => ({
            pid: year.pid,
            title: year.year,
            model: year.model as DocumentTypeEnum,
            accessibility: year.accessibility,
            licenses: year.licenses,
            access: 'public' // Default access for periodical years
          }));
          this.selectionService.updateCurrentPageItems(yearItems);
        }
      })
    );

    // Track periodical children (issues) for year-issues-grid view
    this.subscriptions.push(
      this.periodical.periodicalChildren$.subscribe(children => {
        if (children && children.length > 0 && this.periodical.viewMode() !== ViewMode.SearchResults) {
          // Convert PeriodicalItemChild[] to SearchDocument format that AdminSelectionService expects
          const childrenItems = children.map(child => ({
            pid: child.pid,
            title: child['date.str'] || `${child['date_range_end.day']}.${child['date_range_end.month']}`,
            model: child.model as DocumentTypeEnum,
            accessibility: child.licenses?.length ? DocumentAccessibilityEnum.PRIVATE : DocumentAccessibilityEnum.PUBLIC,
            licenses: child['licenses.facet'] || child.licenses || [],
            access: 'public' // Default access for periodical children
          }));
          this.selectionService.updateCurrentPageItems(childrenItems);
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

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.periodical.changeSortBy(event.value, event.direction);
  }

  toggleSelectionMode(): void {
    if (this.periodical.viewMode() === ViewMode.Timeline) {
      this.periodical.setView(ViewMode.GridYears)
    } else if (this.periodical.viewMode() === ViewMode.Calendar) {
      this.periodical.setView(ViewMode.GridIssues);
    }
    this.selectionService.toggleSelectionMode();
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
