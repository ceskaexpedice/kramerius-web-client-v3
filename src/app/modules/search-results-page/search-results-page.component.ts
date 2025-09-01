import {Component, inject, OnInit, signal} from '@angular/core';
import {SearchService} from '../../shared/services/search.service';
import {AdvancedSearchService} from '../../shared/services/advanced-search.service';
import {AppResultsViewType} from '../settings/settings.model';
import {SettingsService} from '../settings/settings.service';
import {SolrSortDirections, SolrSortFields} from '../../core/solr/solr-helpers';
import {AdminSelectionService} from '../../shared/services/admin-selection.service';

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit {

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-element-3' },
    { value: AppResultsViewType.list, icon: 'icon-row-vertical' }
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);

  protected readonly ViewOptions = AppResultsViewType;

  public searchService = inject(SearchService);
  public advancedSearchService = inject(AdvancedSearchService);
  public settingsService = inject(SettingsService);
  public adminSelectionService = inject(AdminSelectionService);

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

}
