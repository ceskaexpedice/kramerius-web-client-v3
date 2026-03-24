import { Component, inject, OnInit, OnDestroy, signal } from '@angular/core';
import { SearchService } from '../../shared/services/search.service';
import { AdvancedSearchService } from '../../shared/services/advanced-search.service';
import { AppResultsViewType } from '../settings/settings.model';
import { SettingsService } from '../settings/settings.service';
import { SolrSortDirections, SolrSortFields } from '../../core/solr/solr-helpers';
import { AdminSelectionService, SelectionService } from '../../shared/services';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';
import { SearchDocument } from '../models/search-document';
import { RecordItem, searchDocumentToRecordItem } from '../../shared/components/record-item/record-item.model';
import { ViewMode } from '../periodical/models/view-mode.enum';
import { ScrollPositionService } from '../../shared/services/scroll-position.service';
import { BreakpointService } from '../../shared/services/breakpoint.service';

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

  // Convert SearchDocument to RecordItem
  toRecordItem(doc: SearchDocument): RecordItem {
    return searchDocumentToRecordItem(doc);
  }

  public searchService = inject(SearchService);
  public advancedSearchService = inject(AdvancedSearchService);
  public settingsService = inject(SettingsService);
  public selectionService = inject(SelectionService);
  public adminSelectionService = inject(AdminSelectionService);
  private scrollPositionService = inject(ScrollPositionService);
  public breakpointService = inject(BreakpointService);

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {

    this.searchService.initialize();

    this.noResults$ = combineLatest([
      this.searchService.loading$,
      this.searchService.selectedTags
    ]).pipe(
      map(([loading, tags]) => {
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

    // layout=grid | list
    // check if in url is set layout
    const urlParams = new URLSearchParams(window.location.search);
    const layout = urlParams.get('viewType') as AppResultsViewType;

    if (layout && Object.values(AppResultsViewType).includes(layout)) {
      this.view.set(layout);
      this.settingsService.settings.searchResultsView = layout;
    } else {
      this.view.set(this.settingsService.settings.searchResultsView || AppResultsViewType.grid);
    }

    // React to settings changes (e.g., when user changes view mode in settings dialog)
    this.subscriptions.push(
      this.settingsService.settings$.subscribe(settings => {
        // Only update if no URL override is present
        const currentUrlParams = new URLSearchParams(window.location.search);
        if (!currentUrlParams.has('viewType') && settings.searchResultsView) {
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
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.searchService.cleanup();
  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    // update the URL with the new view type
    const url = new URL(window.location.href);
    url.searchParams.set('viewType', view);
    window.history.replaceState({}, '', url.toString());
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

  openExportPanel(record: SearchDocument): void {
    this.exportRecord.set(record);
  }

  closeExportPanel(): void {
    this.exportRecord.set(null);
  }

  protected readonly ViewMode = ViewMode;
}
