import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { SolrService } from '../../core/solr/solr.service';
import { AltoService } from './alto.service';
import { IIIFViewerService } from './iiif-viewer.service';
import { DetailViewService } from '../../modules/detail-view-page/services/detail-view.service';
import { ActivatedRoute } from '@angular/router';
import { SearchResult } from '../components/search-results-list/search-results-list.component';
import {removeInterpunction} from '../utils/remove-interpunction';

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

  isCaseSensitive: boolean = false;
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

  caseSensitiveChanged(documentUuid: string, term: string) {
    this.isCaseSensitive = !this.isCaseSensitive;

    this.fetchSearchResults(documentUuid, term);
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
        return results
          .map(result => {
          // Remove the highlighting markers (>> <<) for display, also remove interpunction, space before word
          let cleanText = result.highlights[0]?.replace(/>>|<</g, '').trim() || '';

          cleanText = removeInterpunction(cleanText);
          // Normalize spaces: replace multiple spaces with single space and trim again
          cleanText = cleanText.replace(/\s+/g, ' ').trim();
          const suggestion = `${cleanText}`;

          // Store the PID for this suggestion (only store first occurrence to avoid overwriting)
          if (!this.suggestionToPidMap.has(suggestion)) {
            this.suggestionToPidMap.set(suggestion, result.pid);
          }

          console.log('suggestionToPidMap::', this.suggestionToPidMap.values())

          return suggestion;
        })
        .filter((suggestion, index, self) => self.indexOf(suggestion) === index); // Remove duplicates
      })
    );
  }

  /**
   * Handles when a user selects a suggestion from the autocomplete
   * Fetches full search results and displays them in the search results list
   */
  selectSuggestion(documentUuid: string, suggestion: string): void {
    console.log('Suggestion selected:', suggestion);

    // Find PID by comparing suggestion with map keys (both without interpunction)
    let pid: string | undefined;
    for (const [key, value] of this.suggestionToPidMap.entries()) {
      const normalizedKey = removeInterpunction(key);
      if (normalizedKey === suggestion) {
        pid = value;
        break;
      }
    }

    console.log('Fetching full search results for term:', suggestion);

    // Set the search term for tracking (use the original term the user typed)
    this.searchTermSubject.next(suggestion);

    // Update URL with fulltext parameter
    this.detailViewService.setFulltextParam(suggestion);

    // Fetch full search results with highlighted snippets
    this.fetchSearchResults(documentUuid, suggestion, pid);
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

    // Wait for image to fully load, then display results
    this.iiifViewerService.imageLoaded$.pipe(take(1)).subscribe(() => {
      this.fetchAndDisplayHighlights(nextPid, this.searchTermSubject.value);
    });
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

    // Wait for image to fully load, then display results
    this.iiifViewerService.imageLoaded$.pipe(take(1)).subscribe(() => {
      this.fetchAndDisplayHighlights(prevPid, this.searchTermSubject.value);
    });
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

    // Wait for image to fully load, then display ALTO highlights
    this.iiifViewerService.imageLoaded$.pipe(take(1)).subscribe(() => {
      this.fetchAndDisplayHighlights(result.pid, this.searchTermSubject.value);
    });
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

      // Fetch full search results (skipNavigation=true to stay on current page)
      this.fetchSearchResults(documentUuid, searchTerm, undefined, true);
    }
  }

  /**
   * Resets the restoration flag (call when document changes)
   */
  resetRestorationFlag(): void {
    this.hasRestoredSearch = false;
  }

  /**
   * Fetches search results and handles navigation to the appropriate page
   * @param documentUuid - Document UUID
   * @param searchTerm - Search term
   * @param targetPid - Optional target PID to navigate to. If not provided, navigates to first result
   * @param skipNavigation - If true, doesn't navigate to any page (used in restore from URL)
   */
  private fetchSearchResults(
    documentUuid: string,
    searchTerm: string,
    targetPid?: string,
    skipNavigation: boolean = false
  ): void {
    this.solrService.getInDocumentSearchResults(documentUuid, searchTerm, this.isCaseSensitive).subscribe({
      next: (results) => {
        console.log(`Received ${results.length} search results with highlights`);

        const searchResults = this.mapAndSortResults(results);
        this.searchResultsSubject.next(searchResults);
        this.allMatchedPages = searchResults.map(r => r.pid);

        // Set search query in viewer service
        this.iiifViewerService.setSearchQuery(searchTerm);

        // Determine which page to navigate to
        let pageToNavigate: string | undefined;
        let pageIndex = 0;

        if (skipNavigation) {
          // For restore from URL: stay on current page if it has matches
          const currentPid = this.detailViewService.currentPagePid;
          if (currentPid) {
            const currentIndex = this.allMatchedPages.indexOf(currentPid);
            this.currentMatchedPageIndexSubject.next(currentIndex);
            console.log('Current page index in results:', currentIndex + 1, '/', this.allMatchedPages.length);

            // If current page has matches, display ALTO highlights
            if (currentIndex !== -1) {
              this.iiifViewerService.imageLoaded$.pipe(take(1)).subscribe(() => {
                this.fetchAndDisplayHighlights(currentPid, searchTerm);
              });
            } else {
              console.log('Current page not in search results');
            }
          }
          return;
        }

        if (targetPid && this.allMatchedPages.includes(targetPid)) {
          // Navigate to specific target PID
          pageToNavigate = targetPid;
          pageIndex = this.allMatchedPages.indexOf(targetPid);
        } else {
          // Navigate to first page with results
          pageToNavigate = this.allMatchedPages[0];
          pageIndex = 0;
        }

        this.currentMatchedPageIndexSubject.next(pageIndex);

        if (pageToNavigate) {
          // Navigate to the selected page
          this.detailViewService.navigateToPage(pageToNavigate);

          // Wait for image to fully load, then display ALTO highlights
          this.iiifViewerService.imageLoaded$.pipe(take(1)).subscribe(() => {
            console.log('image loaded');
            this.fetchAndDisplayHighlights(pageToNavigate!, searchTerm);
          });
        }
      },
      error: (error) => {
        console.error('Error fetching search results:', error);
      }
    });
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
      const page = pages[pageIndex];
      return {
        pid: r.pid,
        highlightedText: r.highlightedText,
        pageNumber: page['page.number'] !== undefined ? page['page.number'] : undefined
      };
    });

    // Sort by page number
    // searchResults.sort((a, b) => {
    //   if (a.pageNumber === undefined) return 1;
    //   if (b.pageNumber === undefined) return -1;
    //   return a.pageNumber - b.pageNumber;
    // });

    console.log(`Search results sorted by page number (1-${searchResults.length})`);

    return searchResults;
  }

  /**
   * Fetches ALTO XML and displays search results for a given page
   * @param pid - Page PID
   * @param searchTerm - Search term to highlight
   */
  private fetchAndDisplayHighlights(pid: string, searchTerm: string): void {
    this.iiifViewerService.setSearchQuery(searchTerm);
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
