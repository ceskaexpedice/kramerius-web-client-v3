import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SearchService } from '../../shared/services/search.service';
import { AdvancedSearchService } from '../../shared/services/advanced-search.service';
import { AppResultsViewType } from '../settings/settings.model';
import { SettingsService } from '../settings/settings.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { AdminSelectionService, SelectionService } from '../../shared/services';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';
import { SearchDocument } from '../models/search-document';
import { MapSearchService } from '../../shared/services/map-search.service';
import { isMapViewParams } from './const/map-utils';
import { ScrollPositionService } from '../../shared/services/scroll-position.service';
import { BreakpointService } from '../../shared/services/breakpoint.service';
import { ExportService } from '../../shared/services/export.service';
import { MobileNavItem } from '../../shared/components/mobile-nav-bar/mobile-nav-bar.component';

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit, OnDestroy {

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-row-horizontal', ariaLabel: 'view-grid--arialabel' },
    { value: AppResultsViewType.list, icon: 'icon-table', ariaLabel: 'view-list--arialabel' },
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);
  showSectionHeaders = signal<boolean>(true);
  exportRecord = signal<SearchDocument | null>(null);
  showSelectedTags$!: Observable<boolean>;
  noResults$!: Observable<boolean>;

  protected readonly ViewOptions = AppResultsViewType;

  public searchService = inject(SearchService);
  public mapSearchService = inject(MapSearchService);
  public advancedSearchService = inject(AdvancedSearchService);
  public settingsService = inject(SettingsService);
  public selectionService = inject(SelectionService);
  public adminSelectionService = inject(AdminSelectionService);
  private scrollPositionService = inject(ScrollPositionService);
  private exportService = inject(ExportService);
  public breakpointService = inject(BreakpointService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private subscriptions: Subscription[] = [];

  // Mobile nav bar
  mobileNavItems: MobileNavItem[] = [
    { id: 'all', label: 'tab-all', icon: 'icon-element-3' },
    { id: 'map', label: 'tab-maps', icon: 'icon-location' },
  ];

  get mobileActiveTab(): string {
    return this.view() === AppResultsViewType.map ? 'map' : 'all';
  }

  onMobileNavChange(id: string): void {
    if (id === 'filters') {
      this.breakpointService.manualToggle.set(true);
    } else {
      this.onTabChanged(id);
    }
  }

  ngOnInit(): void {

    this.searchService.initialize();

    this.noResults$ = combineLatest([
      this.searchService.loading$,
      this.searchService.selectedTags
    ]).pipe(
      map(([loading, tags]) => {
        if (this.view() === AppResultsViewType.map) return false;
        if (loading || this.searchService.totalCount > 0) return false;
        // Only dim sidebar when there are no active facet filters
        // (i.e. the only tags are the search query itself)
        const hasActiveFilters = tags.some(t => !t.startsWith('search:'));
        return !hasActiveFilters;
      })
    );

    this.showSelectedTags$ = combineLatest([
      this.searchService.selectedTags,
      this.searchService.loading$,
    ]).pipe(
      map(([tags, loading]) => {
        if (tags.length === 0) return false;
        const onlyTextFilter = tags.every(t => t.startsWith('search:'));
        if (!loading && this.searchService.totalCount === 0 && onlyTextFilter) return false;
        return true;
      })
    );

    // Activate map mode if coordinates are present in URL
    const urlParams = new URLSearchParams(window.location.search);
    const initialParams = Object.fromEntries(urlParams.entries());

    if (isMapViewParams(initialParams)) {
      this.view.set(AppResultsViewType.map);
    } else {
      const layout = urlParams.get('viewType') as AppResultsViewType;
      if (layout && Object.values(AppResultsViewType).includes(layout)) {
        this.view.set(layout);
        this.settingsService.settings.searchResultsView = layout;
      } else {
        this.view.set(this.settingsService.settings.searchResultsView || AppResultsViewType.grid);
      }
    }

    // React to settings changes (e.g., when user changes view mode in settings dialog)
    this.subscriptions.push(
      this.settingsService.settings$.subscribe(settings => {
        // Only update if no URL override is present
        const currentParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());
        if (!isMapViewParams(currentParams) && !currentParams['viewType'] && settings.searchResultsView) {
          this.view.set(settings.searchResultsView);
        }
      })
    )

    // Set up admin selection service to track current page items
    this.subscriptions.push(
      combineLatest([
        this.searchService.nonPageResults$,
        this.searchService.articleResults$,
        this.searchService.pageResults$,
        this.searchService.attachmentResults$
      ]).pipe(
        map(([nonPageResults, articleResults, pageResults, attachmentResults]) => {
          const allResults: SearchDocument[] = [];
          if (nonPageResults) allResults.push(...nonPageResults);
          if (articleResults) allResults.push(...articleResults);
          if (pageResults) allResults.push(...pageResults);
          if (attachmentResults) allResults.push(...attachmentResults);
          return allResults;
        })
      ).subscribe(allCurrentItems => {
        this.adminSelectionService.updateCurrentPageItems(allCurrentItems);
      })
    );

    this.subscriptions.push(
      combineLatest([
        this.searchService.nonPageResults$,
        this.searchService.articleResults$,
        this.searchService.pageResults$,
        this.searchService.attachmentResults$
      ]).pipe(
        map(([a, b, c, d]) => {
          let count = 0;
          if (a && a.length) count++;
          if (b && b.length) count++;
          if (c && c.length) count++;
          if (d && d.length) count++;
          return count > 1;
        })
      ).subscribe(show => this.showSectionHeaders.set(show))
    );

    // Notify scroll service when content has finished loading
    this.subscriptions.push(
      this.searchService.loading$.pipe(
        filter(loading => loading === false)
      ).subscribe(() => {
        this.scrollPositionService.notifyContentLoaded();
      })
    );

    const combinedResults$ = combineLatest([
      this.searchService.loading$,
      this.searchService.nonPageResults$,
      this.searchService.articleResults$,
      this.searchService.pageResults$,
      this.searchService.attachmentResults$,
    ]).pipe(
      filter(([loading]) => loading === false),
      map(([, nonPage, articles, pages, attachments]) => [
        ...(nonPage || []),
        ...(articles || []),
        ...(pages || []),
        ...(attachments || []),
      ])
    );

    const sub = this.exportService.rehydrateExportPanel(
      this.route,
      combinedResults$,
      doc => this.exportRecord.set(doc)
    );
    if (sub) this.subscriptions.push(sub);
  }

  onExportRecordChange(record: SearchDocument | null): void {
    this.exportRecord.set(record);
    this.exportService.writeExportPidToUrl(this.route, record?.pid ?? null);
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchService.cleanup();
  }

  onTabChanged(tab: string): void {
    if (tab === 'map') {
      this.setView(AppResultsViewType.map);
    } else {
      const prevView = this.settingsService.settings.searchResultsView;
      const validView = prevView && prevView !== AppResultsViewType.map ? prevView : AppResultsViewType.grid;
      this.setView(validView);
    }
  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    const currentParams = this.route.snapshot.queryParams;

    if (view === AppResultsViewType.map) {
      // Map mode: default to score sort; remove viewType; coords written by MapBrowseComponent
      this.searchService.changeSortBy(SolrSortFields.relevance, SolrSortDirections.desc);
      const { viewType, ...rest } = currentParams;
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { ...rest, viewType: null },
        queryParamsHandling: 'merge',
        replaceUrl: true
      });
    } else {
      const wasMapMode = isMapViewParams(currentParams);
      // Non-map: remove coords via router so Angular's snapshot is updated
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          north: null, south: null, east: null, west: null,
          viewType: view
        },
        queryParamsHandling: 'merge',
        replaceUrl: true
      }).then(() => {
        if (wasMapMode) {
          const cleanParams = { ...this.route.snapshot.queryParams };
          this.searchService.dispatchSearch(cleanParams);
        }
      });
    }
    this.settingsService.settings.searchResultsView = view;
    this.settingsService.saveToStorage(this.settingsService.settings);
  }

  onSortChange(event: { value: SolrSortFields; direction: SolrSortDirections }) {
    this.searchService.changeSortBy(event.value, event.direction);
  }

  toggleAdminMode(): void {
    this.adminSelectionService.toggleAdminMode();
  }

  // Admin action methods (delegated from admin-actions component)
  onExportSelected(): void {
    // The AdminActionsComponent handles the export logic by default
    // This method can be used to add additional page-specific export behavior if needed
  }

  onEditSelected(selectedIds: string[]): void {
    console.log('Edit selected items:', selectedIds);
    // TODO: Implement edit functionality specific to search results
  }

  downloadCsv(): void {
    this.searchService.results$.pipe(take(1)).subscribe(results => {
      this.exportService.downloadSearchResultsCsv(results);
    });
  }
}
