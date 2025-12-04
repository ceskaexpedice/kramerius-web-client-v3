import {Component, inject, OnInit, OnDestroy, signal} from '@angular/core';
import {SearchService} from '../../shared/services/search.service';
import {AdvancedSearchService} from '../../shared/services/advanced-search.service';
import {AppResultsViewType} from '../settings/settings.model';
import {SettingsService} from '../settings/settings.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {AdminSelectionService, SelectionService} from '../../shared/services';
import {Subscription, combineLatest} from 'rxjs';
import {map, filter} from 'rxjs/operators';
import {SearchDocument} from '../models/search-document';
import {RecordItem, searchDocumentToRecordItem} from '../../shared/components/record-item/record-item.model';
import {ViewMode} from '../periodical/models/view-mode.enum';
import {ScrollPositionService} from '../../shared/services/scroll-position.service';

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit, OnDestroy {

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-element-3', ariaLabel: 'Grid view' },
    { value: AppResultsViewType.list, icon: 'icon-row-vertical', ariaLabel: 'List View' },
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);

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

  private subscriptions: Subscription[] = [];

  ngOnInit(): void {

    this.searchService.initialize();

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

  protected readonly ViewMode = ViewMode;
}
