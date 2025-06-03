import {Component, OnInit, signal} from '@angular/core';
import {SearchService} from '../../shared/services/search.service';
import {AdvancedSearchService} from '../../shared/services/advanced-search.service';

export enum ViewType {
  grid = 'grid',
  list = 'list'
}

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit {

  viewOptions = [
    { value: ViewType.grid, icon: 'icon-element-3' },
    { value: ViewType.list, icon: 'icon-row-vertical' }
  ];

  view = signal<ViewType>(ViewType.grid);

  constructor(
    public searchService: SearchService,
    public advancedSearchService: AdvancedSearchService
  ) {
  }

  ngOnInit(): void {

    this.searchService.initialize();

  }

  setView(view: ViewType) {
    this.view.set(view);
  }

  protected readonly ViewOptions = ViewType;
}
