import {Component, EventEmitter, Input, Output} from '@angular/core';
import {SelectComponent} from '../../../../shared/components/select/select.component';
import {SolrSortDirections, SolrSortFields} from '../../../../core/solr/solr-helpers';

interface SortOption {
  label: string;
  value: SolrSortFields;
  direction: SolrSortDirections;
}

interface SortChangeEvent {
  value: SolrSortFields;
  direction: SolrSortDirections;
}

@Component({
  selector: 'app-results-sort',
  imports: [
    SelectComponent,
  ],
  templateUrl: './results-sort.component.html',
  styleUrl: './results-sort.component.scss'
})
export class ResultsSortComponent {

  @Input() selectedSort: SolrSortFields = SolrSortFields.relevance;
  @Input() selectedDirection: SolrSortDirections = SolrSortDirections.desc;
  @Output() sortChange: EventEmitter<SortChangeEvent> = new EventEmitter<SortChangeEvent>();

  sortOptions: SortOption[] = [
    { label: 'sort-relevance', value: SolrSortFields.relevance, direction: SolrSortDirections.desc },
    { label: 'sort-alphabetical', value: SolrSortFields.title, direction: SolrSortDirections.asc },
    { label: 'sort-date-newest', value: SolrSortFields.dateMax, direction: SolrSortDirections.desc },
    { label: 'sort-date-oldest', value: SolrSortFields.dateMin, direction: SolrSortDirections.asc },
  ]

  get selectedSortOption(): SortOption {
    return this.sortOptions.find(option =>
      option.value === this.selectedSort && option.direction === this.selectedDirection
    ) || this.sortOptions[0];
  }

  onSortChange(event: SortOption) {
    this.sortChange.emit({
      value: event.value,
      direction: event.direction
    });
  }

  sortOptionDisplayFn = (option: any) => option ? option.label : '';

}
