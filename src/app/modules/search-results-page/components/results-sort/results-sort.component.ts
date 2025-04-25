import { Component } from '@angular/core';
import {SelectComponent} from '../../../../shared/components/select/select.component';

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
    { label: 'Relevance', value: 'relevance' },
    { label: 'Date', value: 'date' },
    { label: 'Newest first', value: 'newest' },
    { label: 'Oldest first', value: 'oldest' },
    { label: 'Alphabetical', value: 'alphabetical' },
  ]

  selectedSortOption = this.sortOptions[0];

  onSortChange(event: any) {
    console.log('Selected sort option:', event);
    this.selectedSortOption = event;
  }

  sortOptionDisplayFn = (option: any) => option ? option.label : '';

}
