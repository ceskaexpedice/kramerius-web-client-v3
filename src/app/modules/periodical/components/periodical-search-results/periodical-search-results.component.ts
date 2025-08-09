import {Component, inject, computed} from '@angular/core';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {PeriodicalService} from '../../../../shared/services/periodical.service';
import {TranslatePipe} from '@ngx-translate/core';
import {RecordItemComponent} from '../../../../shared/components/record-item/record-item.component';
import {PaginatorComponent} from '../../../../shared/components/paginator/paginator.component';
import {ResultsSortComponent} from '../../../search-results-page/components/results-sort/results-sort.component';
import {SolrSortFields} from '../../../../core/solr/solr-helpers';
import {SearchDocument} from '../../../models/search-document';
import {SelectedTagsComponent} from '../../../../shared/components/selected-tags/selected-tags.component';

@Component({
  selector: 'app-periodical-search-results',
  imports: [
    NgIf,
    AsyncPipe,
    RecordItemComponent,
    NgForOf,
    PaginatorComponent,
    ResultsSortComponent,
    SelectedTagsComponent,
  ],
  templateUrl: './periodical-search-results.component.html',
  styleUrl: './periodical-search-results.component.scss'
})
export class PeriodicalSearchResultsComponent {

  currentSortBy = SolrSortFields.relevance;

  public periodicalService = inject(PeriodicalService);

  // Cache for grouped results to avoid recomputation
  private cachedGroupedResults: { [year: string]: SearchDocument[] } | null = null;
  private cachedResultsHash: string | null = null;

  sortChanged(sort: SolrSortFields) {
    this.currentSortBy = sort;
  }

  // Check if we should group by year
  shouldGroupByYear(): boolean {
    const sortBy = this.periodicalService.sortBy;
    return sortBy === SolrSortFields.dateMin || sortBy === SolrSortFields.dateMax;
  }

  // Helper method to group search results by year with caching
  groupResultsByYear(results: SearchDocument[]): { [year: string]: SearchDocument[] } {
    // Create a hash of the results to detect changes
    const resultsHash = JSON.stringify(results.map(r => r.pid + r.date + r.year));
    
    // Return cached results if they haven't changed
    if (this.cachedGroupedResults && this.cachedResultsHash === resultsHash) {
      return this.cachedGroupedResults;
    }
    
    const grouped: { [year: string]: SearchDocument[] } = {};
    
    results.forEach(doc => {
      const year = this.extractYear(doc);
      if (!year) return;
      
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push(doc);
    });
    
    // Sort items within each year by full date
    Object.keys(grouped).forEach(year => {
      grouped[year] = this.sortByDate(grouped[year]);
    });
    
    // Cache the results
    this.cachedGroupedResults = grouped;
    this.cachedResultsHash = resultsHash;
    
    return grouped;
  }

  // Helper method to extract year from document
  private extractYear(doc: SearchDocument): string | null {
    // First try the year field
    if (doc.year) {
      return doc.year.toString();
    }
    
    // If no year field, try to extract from date field (dd.mm.yyyy format)
    if (doc.date) {
      const dateParts = doc.date.split('.');
      if (dateParts.length === 3) {
        return dateParts[2]; // yyyy part
      }
    }
    
    return null;
  }

  // Helper method to sort documents by date within a year
  private sortByDate(docs: SearchDocument[]): SearchDocument[] {
    return docs.sort((a, b) => {
      const dateA = this.getDateForSorting(a);
      const dateB = this.getDateForSorting(b);
      
      const sortDirection = this.periodicalService.sortDirection;
      const comparison = dateA.localeCompare(dateB);
      
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }

  // Helper method to get sortable date string (YYYY-MM-DD format)
  private getDateForSorting(doc: SearchDocument): string {
    // If we have year, month, day fields
    if (doc.year) {
      const year = doc.year.toString().padStart(4, '0');
      const month = (doc.month || 1).toString().padStart(2, '0');
      const day = (doc.day || 1).toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    
    // If we have date field in dd.mm.yyyy format
    if (doc.date) {
      const dateParts = doc.date.split('.');
      if (dateParts.length === 3) {
        const day = dateParts[0].padStart(2, '0');
        const month = dateParts[1].padStart(2, '0');
        const year = dateParts[2];
        return `${year}-${month}-${day}`;
      }
    }
    
    // Fallback
    return '0000-01-01';
  }

  // Helper method to get sorted years
  getSortedYears(grouped: { [year: string]: SearchDocument[] }): string[] {
    const sortDirection = this.periodicalService.sortDirection;
    return Object.keys(grouped).sort((a, b) => {
      const comparison = a.localeCompare(b);
      return sortDirection === 'desc' ? -comparison : comparison;
    });
  }

}
