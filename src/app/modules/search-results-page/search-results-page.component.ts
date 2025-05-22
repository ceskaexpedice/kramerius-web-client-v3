import {Component, OnInit} from '@angular/core';
import {SearchService} from '../../shared/services/search.service';
import {AdvancedSearchService} from '../../shared/services/advanced-search.service';

@Component({
  selector: 'app-search-results-page',
  standalone: false,
  templateUrl: './search-results-page.component.html',
  styleUrl: './search-results-page.component.scss'
})
export class SearchResultsPageComponent implements OnInit {


  constructor(
    public searchService: SearchService,
    public advancedSearchService: AdvancedSearchService
  ) {
  }

  ngOnInit(): void {

    this.searchService.initialize();

  }

}
