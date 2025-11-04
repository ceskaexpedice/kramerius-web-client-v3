import { Component, Input, Output, EventEmitter } from '@angular/core';
import { NgFor } from '@angular/common';
import {
  DetailPageItemComponent
} from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';

export interface SearchResult {
  pid: string;
  highlightedText: string;
  pageNumber?: number;
}

@Component({
  selector: 'app-search-results-list',
  standalone: true,
  imports: [NgFor, DetailPageItemComponent],
  templateUrl: './search-results-list.component.html',
  styleUrl: './search-results-list.component.scss'
})
export class SearchResultsListComponent {
  @Input() results: SearchResult[] = [];
  @Input() currentPid: string | null = null;

  @Output() resultClick = new EventEmitter<SearchResult>();

  onResultClick(result: SearchResult): void {
    this.resultClick.emit(result);
  }

  isActive(result: SearchResult): boolean {
    return result.pid === this.currentPid;
  }
}
