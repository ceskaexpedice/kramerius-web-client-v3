import { Component, inject, Input } from '@angular/core';
import {AsyncPipe, NgForOf, NgIf, UpperCasePipe} from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { Observable } from 'rxjs';
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

  /**
   * Total result count to drive the "no results" message. Defaults to the
   * main search service so the All view keeps its existing behavior; the map
   * view passes its own count (mapSearchService.totalCount$).
   */
  @Input() totalCount$: Observable<number> = this.searchService.totalCount$;

  /** Loading state matching the count source above. */
  @Input() loading$: Observable<boolean> = this.searchService.loading$;

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
