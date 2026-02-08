import { Component, Input, Output, EventEmitter, ElementRef, AfterViewChecked, SimpleChanges, OnChanges } from '@angular/core';
import {
  DetailPageItemComponent
} from '../../../modules/detail-view-page/components/detail-page-item/detail-page-item.component';
import { Page } from '../../models/page.model';
import {TranslatePipe} from '@ngx-translate/core';
import {TooltipDirective} from '../../directives/tooltip/tooltip.directive';
import {CdkTooltipDirective} from '../../directives';

export interface SearchResult {
  pid: string;
  highlightedText: string;
  pageNumber?: string;
}

export interface DisplayItem extends SearchResult {
  page?: Page;
}

@Component({
  selector: 'app-search-results-list',
  standalone: true,
  imports: [DetailPageItemComponent, TranslatePipe, TooltipDirective, CdkTooltipDirective],
  templateUrl: './search-results-list.component.html',
  styleUrl: './search-results-list.component.scss'
})
export class SearchResultsListComponent implements OnChanges, AfterViewChecked {
  @Input() results: SearchResult[] = [];
  @Input() currentPid: string | null = null;
  @Input() showAllPages: boolean = false;
  @Input() allPages: Page[] = [];

  @Output() resultClick = new EventEmitter<SearchResult>();

  private previousPid: string | null = null;
  private shouldScroll = false;

  constructor(private elementRef: ElementRef) {}

  /**
   * Computes the display list based on showAllPages flag
   * - If showAllPages is false: shows only search results
   * - If showAllPages is true: shows all pages with their search results merged in
   */
  get displayItems(): DisplayItem[] {
    if (!this.showAllPages) {
      return this.results;
    }

    const resultsMap = new Map<string, SearchResult>();
    this.results.forEach(result => {
      resultsMap.set(result.pid, result);
    });

    return this.allPages.map(page => {
      const searchResult = resultsMap.get(page.pid);
      return {
        pid: page.pid,
        highlightedText: searchResult?.highlightedText || '',
        pageNumber: searchResult?.pageNumber || page['page.number'],
        page: page
      };
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Check if currentPid has changed
    if (changes['currentPid'] && changes['currentPid'].currentValue !== this.previousPid) {
      this.previousPid = changes['currentPid'].currentValue;
      this.shouldScroll = true;
    }
  }

  ngAfterViewChecked(): void {
    if (this.shouldScroll && this.currentPid) {
      this.scrollToActiveItem();
      this.shouldScroll = false;
    }
  }

  private scrollToActiveItem(): void {
    const activeElement = this.elementRef.nativeElement.querySelector('.search-result-item.active');
    if (activeElement) {
      activeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
    }
  }

  onResultClick(result: DisplayItem): void {
    this.resultClick.emit(result);
  }

  isActive(result: DisplayItem): boolean {
    return result.pid === this.currentPid;
  }
}
