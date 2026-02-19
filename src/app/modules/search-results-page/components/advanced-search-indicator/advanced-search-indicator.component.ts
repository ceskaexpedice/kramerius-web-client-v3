import { Component, inject } from '@angular/core';
import {AsyncPipe, NgForOf, NgIf, UpperCasePipe} from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AdvancedSearchService } from '../../../../shared/services/advanced-search.service';
import { SearchService } from '../../../../shared/services/search.service';
import { ENVIRONMENT } from '../../../../app.config';

@Component({
  selector: 'app-advanced-search-indicator',
  imports: [
    NgForOf,
    NgIf,
    TranslatePipe,
    UpperCasePipe,
    AsyncPipe,
  ],
  templateUrl: './advanced-search-indicator.component.html',
  styleUrl: './advanced-search-indicator.component.scss'
})
export class AdvancedSearchIndicatorComponent {

  public advancedSearchService = inject(AdvancedSearchService);
  public searchService = inject(SearchService);
  public contactEmail = ENVIRONMENT.contactEmail;

  updateQuery() {
    this.advancedSearchService.openDialog();
  }

  newSearch() {
    this.advancedSearchService.clear();
    this.advancedSearchService.openDialog();
  }

  clearAll() {
    this.searchService.resetPage();
    this.advancedSearchService.clear();
  }

}
