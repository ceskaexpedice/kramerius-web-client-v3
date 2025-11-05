import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SolrService } from '../../core/solr/solr.service';
import { AltoService } from './alto.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { ActivatedRoute } from '@angular/router';
import { SearchResult } from '../components/search-results-list/search-results-list.component';

/**
 * Service to manage in-document search functionality
 * Handles search execution, state management, navigation, and URL synchronization
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentSearchService {
  private solrService = inject(SolrService);
  private altoService = inject(AltoService);
  private iiifViewerService = inject(IIIFViewerService);
  private detailViewService = inject(DetailViewService);
  private route = inject(ActivatedRoute);

  // Search state
  private searchTermSubject = new BehaviorSubject<string>('');
  public searchTerm$ = this.searchTermSubject.asObservable();

  private searchResultsSubject = new BehaviorSubject<SearchResult[]>([]);
  public searchResults$ = this.searchResultsSubject.asObservable();

  private currentMatchedPageIndexSubject = new BehaviorSubject<number>(0);
  public currentMatchedPageIndex$ = this.currentMatchedPageIndexSubject.asObservable();

  private allMatchedPages: string[] = [];
  private suggestionToPidMap = new Map<string, string>();
  private hasRestoredSearch = false;

  /**
   * Gets the current page number (1-indexed) in search results
   */
  getCurrentMatchNumber(): number {
    return this.currentMatchedPageIndexSubject.value + 1;
  }

  /**
   * Gets the total number of pages with matches
   */
  getTotalMatchedPages(): number {
    return this.allMatchedPages.length;
  }

  /**
   * Gets autocomplete suggestions for in-document search
   * NOTE: This only fetches suggestions for the dropdown, NOT the full search results
   */
  getSuggestions(documentUuid: string, term: string): Observable<string[]> {
    console.log('getSuggestions called with term:', term);

    if (!documentUuid || !term || term.trim().length < 2) {
      console.log('Skipping suggestions - invalid term or no document UUID');
      return of([]);
    }

    console.log('Fetching suggestions for document:', documentUuid);

    return this.solrService.getInDocumentSuggestions(documentUuid, term).pipe(
      map(results => {
        console.log('Received suggestions:', results.length, 'pages with matches');

        // Clear previous mapping
        this.suggestionToPidMap.clear();

        // Build suggestions array and store PID mapping
        return results.map(result => {
          // Remove the highlighting markers (>> <<) for display
          const cleanText = result.highlights[0]?.replace(/>>|<</g, '').trim() || '';
          const suggestion = `${cleanText}`;

          // Store the PID for this suggestion
          this.suggestionToPidMap.set(suggestion, result.pid);

          return suggestion;
        });
      })
    );
  }

  /**
   * Handles when a user selects a suggestion from the autocomplete
   * Fetches full search results and displays them in the search results list
   */
  selectSuggestion(documentUuid: string, suggestion: string): void {
    console.log('Suggestion selected:', suggestion);

    const pid = this.suggestionToPidMap.get(suggestion);

    if (!pid || !documentUuid) {
      console.warn('No PID found, no search term, or no document UUID:', {
        pid,
        term: suggestion,
        documentUuid
      });
      return;
    }

    console.log('Fetching full search results for term:', suggestion);

    // Set the search term for tracking (use the original term the user typed)
    this.searchTermSubject.next(suggestion);

    // Update URL with fulltext parameter
    this.detailViewService.setFulltextParam(suggestion);

    // Fetch full search results with highlighted snippets
    this.solrService.getInDocumentSearchResults(documentUuid, suggestion).subscribe({
      next: (results) => {
        console.log(`Received ${results.length} search results with highlights`);

        const searchResults = this.mapAndSortResults(results);
        this.searchResultsSubject.next(searchResults);
        this.allMatchedPages = searchResults.map(r => r.pid);
        //this.currentMatchedPageIndexSubject.next(this.allMatchedPages.indexOf(pid));
        this.currentMatchedPageIndexSubject.next(0);

        const firstPagePid = this.allMatchedPages[0];

        // Navigate to the selected page
        this.detailViewService.navigateToPage(firstPagePid);

        // Wait a bit for the page to load, then display ALTO highlights
        setTimeout(() => {
          this.fetchAndDisplayHighlights(firstPagePid, suggestion);
        }, 100);
      },
      error: (error) => {
        console.error('Error fetching search results:', error);
      }
    });
  }

  /**
   * Handles search submission (when user presses enter)
   * Searches on the current page only (not across all pages)
   */
  executeSearch(documentUuid: string, term: string): void {
    console.log('executeSearch called with term:', term);

    this.searchTermSubject.next(term);

    if (!term || !this.detailViewService.currentPagePid) {
      // Clear overlays if search is cleared
      if (!term) {
        console.log('🧹 Clearing search');
        this.clearSearch();
      }
      return;
    }

    console.log('Searching on current page only:', {
      term,
      currentPagePid: this.detailViewService.currentPagePid
    });

    // Update URL with fulltext parameter
    this.detailViewService.setFulltextParam(term);

    // Clear page navigation since we're only searching current page
    this.allMatchedPages = [this.detailViewService.currentPagePid];
    this.currentMatchedPageIndexSubject.next(0);

    // Fetch ALTO for current page and display results
    this.fetchAndDisplayHighlights(this.detailViewService.currentPagePid, term);
  }

  /**
   * Clears search state and overlays
   */
  clearSearch(): void {
    this.searchTermSubject.next('');
    this.iiifViewerService.clearSearch();
    this.allMatchedPages = [];
    this.currentMatchedPageIndexSubject.next(0);
    this.searchResultsSubject.next([]);
    // Remove fulltext parameter from URL
    this.detailViewService.setFulltextParam(null);
  }

  /**
   * Navigate to the next page with matches
   */
  navigateToNextMatch(): void {
    if (this.allMatchedPages.length === 0) {
      return;
    }

    // Move to next page with matches
    const currentIndex = this.currentMatchedPageIndexSubject.value;
    const nextIndex = (currentIndex + 1) % this.allMatchedPages.length;
    this.currentMatchedPageIndexSubject.next(nextIndex);
    const nextPid = this.allMatchedPages[nextIndex];

    console.log('Navigating to next matched page:', {
      pageIndex: nextIndex + 1,
      totalPages: this.allMatchedPages.length,
      pid: nextPid
    });

    // Navigate to the page
    this.detailViewService.navigateToPage(nextPid);

    // Wait for page to load, then display results
    setTimeout(() => {
      this.fetchAndDisplayHighlights(nextPid, this.searchTermSubject.value);
    }, 500);
  }

  /**
   * Navigate to the previous page with matches
   */
  navigateToPreviousMatch(): void {
    if (this.allMatchedPages.length === 0) {
      return;
    }

    // Move to previous page with matches
    const currentIndex = this.currentMatchedPageIndexSubject.value;
    const prevIndex = (currentIndex - 1 + this.allMatchedPages.length) % this.allMatchedPages.length;
    this.currentMatchedPageIndexSubject.next(prevIndex);
    const prevPid = this.allMatchedPages[prevIndex];

    console.log('Navigating to previous matched page:', {
      pageIndex: prevIndex + 1,
      totalPages: this.allMatchedPages.length,
      pid: prevPid
    });

    // Navigate to the page
    this.detailViewService.navigateToPage(prevPid);

    // Wait for page to load, then display results
    setTimeout(() => {
      this.fetchAndDisplayHighlights(prevPid, this.searchTermSubject.value);
    }, 500);
  }

  /**
   * Handles when user clicks on a search result in the list
   */
  navigateToResult(result: SearchResult): void {
    console.log('Search result clicked:', result.pid);

    // Find the index of this page
    const index = this.allMatchedPages.indexOf(result.pid);
    if (index !== -1) {
      this.currentMatchedPageIndexSubject.next(index);
    }

    // Navigate to the page
    this.detailViewService.navigateToPage(result.pid);

    // Wait for page to load, then display ALTO highlights
    setTimeout(() => {
      this.fetchAndDisplayHighlights(result.pid, this.searchTermSubject.value);
    }, 500);
  }

  /**
   * Checks URL for fulltext parameter and restores search state if present
   */
  restoreSearchFromUrl(documentUuid: string): void {
    // Only restore once per component lifecycle
    if (this.hasRestoredSearch || !documentUuid) {
      return;
    }

    const fulltextParam = this.route.snapshot.queryParams['fulltext'];

    if (fulltextParam && fulltextParam.trim().length > 0) {
      console.log('Restoring search from URL parameter:', fulltextParam);
      this.hasRestoredSearch = true;

      // Set the search term
      const searchTerm = fulltextParam.trim();
      this.searchTermSubject.next(searchTerm);

      // Fetch full search results
      this.solrService.getInDocumentSearchResults(documentUuid, searchTerm).subscribe({
        next: (results) => {
          console.log(`Restored ${results.length} search results from URL`);

          const searchResults = this.mapAndSortResults(results);
          this.searchResultsSubject.next(searchResults);
          this.allMatchedPages = searchResults.map(r => r.pid);

          // IMPORTANT: Set the search query in the service to show search navigation
          // This is normally done in displaySearchHighlights, but we need it set
          // even if the current page doesn't have matches
          this.iiifViewerService.setSearchQuery(searchTerm);
          console.log('Set search query in iiifViewerService:', searchTerm);

          // Find current page in results
          const currentPid = this.detailViewService.currentPagePid;
          if (currentPid) {
            const currentIndex = this.allMatchedPages.indexOf(currentPid);
            this.currentMatchedPageIndexSubject.next(currentIndex);

            console.log('Current page index in results:', currentIndex + 1, '/', this.allMatchedPages.length);

            // If current page has matches, display ALTO highlights
            if (currentIndex !== -1) {
              setTimeout(() => {
                this.fetchAndDisplayHighlights(currentPid, searchTerm);
              }, 300);
            } else {
              console.log('Current page not in search results');
            }
          }
        },
        error: (error) => {
          console.error('Error restoring search results from URL:', error);
        }
      });
    }
  }

  /**
   * Resets the restoration flag (call when document changes)
   */
  resetRestorationFlag(): void {
    this.hasRestoredSearch = false;
  }

  /**
   * Maps Solr results to SearchResult format and sorts by page number
   */
  private mapAndSortResults(results: any[]): SearchResult[] {
    // Get pages array to map PIDs to page numbers
    const pages = this.detailViewService.pages;

    // Convert to SearchResult format and add page numbers
    const searchResults: SearchResult[] = results.map(r => {
      const pageIndex = pages.findIndex(p => p.pid === r.pid);
      return {
        pid: r.pid,
        highlightedText: r.highlightedText,
        pageNumber: pageIndex !== -1 ? pageIndex + 1 : undefined
      };
    });

    // Sort by page number
    searchResults.sort((a, b) => {
      if (a.pageNumber === undefined) return 1;
      if (b.pageNumber === undefined) return -1;
      return a.pageNumber - b.pageNumber;
    });

    console.log(`Search results sorted by page number (1-${searchResults.length})`);

    return searchResults;
  }

  /**
   * Fetches ALTO XML and displays search results for a given page
   * @param pid - Page PID
   * @param searchTerm - Search term to highlight
   */
  private fetchAndDisplayHighlights(pid: string, searchTerm: string): void {
    this.altoService.fetchAltoXml(pid).subscribe({
      next: (altoXml) => {
        const count = this.iiifViewerService.displaySearchHighlights(altoXml, searchTerm);
        if (count > 0) {
          console.log(`Successfully displayed ${count} search result rectangles on this page`);
        } else if (count === 0) {
          console.warn('No matches found for search term on this page:', searchTerm);
        } else {
          console.error('Failed to display search results');
        }
      },
      error: (error) => {
        console.error('Error fetching ALTO XML for PID:', pid, error);
      }
    });
  }
}
