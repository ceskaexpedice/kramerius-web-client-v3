import {Component, inject, OnInit, signal} from '@angular/core';
import {SearchService} from '../../shared/services/search.service';
import {AdvancedSearchService} from '../../shared/services/advanced-search.service';
import {AppResultsViewType} from '../settings/settings.model';
import {SettingsService} from '../settings/settings.service';

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

  ngOnInit(): void {

    this.searchService.initialize();

    console.log('this.settingsService.settings:', this.settingsService.settings);
    this.view.set(this.settingsService.settings.searchResultsView || AppResultsViewType.grid);

  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    this.settingsService.settings.searchResultsView = view;
    this.settingsService.saveToStorage(this.settingsService.settings);
  }

}
