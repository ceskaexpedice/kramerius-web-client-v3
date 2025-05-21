import {Component, computed, inject} from '@angular/core';
import {SelectComponent} from '../../../../shared/components/select/select.component';
import {SearchService} from '../../../../shared/services/search.service';
import {SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';

@Component({
  selector: 'app-results-sort',
  imports: [
    SelectComponent,
  ],
  templateUrl: './results-sort.component.html',
  styleUrl: './results-sort.component.scss'
})
export class ResultsSortComponent {

  sortOptions = [
    { label: 'sort-relevance', value: SolrSortFields.relevance, direction: SolrSortDirections.desc },
    { label: 'sort-alphabetical', value: SolrSortFields.title, direction: SolrSortDirections.asc },
    { label: 'sort-date-newest', value: SolrSortFields.dateMax, direction: SolrSortDirections.desc },
    { label: 'sort-date-oldest', value: SolrSortFields.dateMin, direction: SolrSortDirections.asc },
  ]

  public searchService = inject(SearchService);

// Computed signal for the selected option
  selectedSortOption = computed(() => {
    const sortBy = this.searchService.sortBy();
    const sortDirection = this.searchService.sortDirection();

    return this.sortOptions.find(option =>
      option.value === sortBy && option.direction === sortDirection
    ) || this.sortOptions[0]; // Default to first option if no match
  });


  onSortChange(event: any) {
    this.searchService.changeSortBy(event.value, event.direction);
  }

  sortOptionDisplayFn = (option: any) => option ? option.label : '';

}
