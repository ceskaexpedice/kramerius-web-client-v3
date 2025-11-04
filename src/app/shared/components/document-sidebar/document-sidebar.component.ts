import { Component, inject, Input, signal, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { NgIf, AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageNavigatorComponent } from '../page-navigator/page-navigator.component';
import { AdminActionsComponent } from '../admin-actions/admin-actions.component';
import { DetailPagesGridComponent } from '../../../modules/detail-view-page/components/detail-pages-grid/detail-pages-grid.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { Metadata } from '../../models/metadata.model';
import { SelectionService } from '../../services';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { SolrService } from '../../../core/solr/solr.service';
import { AltoService } from '../../services/alto.service';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { map, Observable, of } from 'rxjs';
import { SearchNavigationComponent } from '../search-navigation/search-navigation.component';
import { SearchResultsListComponent, SearchResult } from '../search-results-list/search-results-list.component';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-document-sidebar',
  imports: [
    NgIf,
    AsyncPipe,
    TranslateModule,
    PageNavigatorComponent,
    AdminActionsComponent,
    DetailPagesGridComponent,
    AutocompleteComponent,
    SearchNavigationComponent,
    SearchResultsListComponent
  ],
  templateUrl: './document-sidebar.component.html',
  styleUrl: './document-sidebar.component.scss'
})
export class DocumentSidebarComponent implements OnInit, OnChanges {
  @Input() document!: Metadata;

  public detailViewService = inject(DetailViewService);
  public selectionService = inject(SelectionService);
  public iiifViewerService = inject(IIIFViewerService);
  private solrService = inject(SolrService);
  private altoService = inject(AltoService);
  private route = inject(ActivatedRoute);

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  // Search state
  public searchTerm = signal('');
  public searchResults = signal<SearchResult[]>([]);
  private suggestionToPidMap = new Map<string, string>();
  private lastSearchTerm = ''; // The actual term the user typed
  private allMatchedPages: string[] = []; // All PIDs with matches from suggestions
  private currentMatchedPageIndex = 0; // Current index in allMatchedPages
  private hasRestoredSearch = false; // Track if we've already restored search from URL

  ngOnInit(): void {
    // Check for fulltext parameter in URL on component initialization
    this.checkAndRestoreSearchFromUrl();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When document changes, check if we need to restore search
    if (changes['document'] && !changes['document'].firstChange && this.document?.uuid) {
      this.checkAndRestoreSearchFromUrl();
    }
  }

  /**
   * Checks URL for fulltext parameter and restores search state if present
   */
  private checkAndRestoreSearchFromUrl(): void {
    // Only restore once per component lifecycle
    if (this.hasRestoredSearch || !this.document?.uuid) {
      return;
    }

    const fulltextParam = this.route.snapshot.queryParams['fulltext'];

    if (fulltextParam && fulltextParam.trim().length > 0) {
      this.hasRestoredSearch = true;

      // Set the search term
      this.lastSearchTerm = fulltextParam.trim();
      this.searchTerm.set(this.lastSearchTerm);

      // Fetch full search results
      this.solrService.getInDocumentSearchResults(this.document.uuid, this.lastSearchTerm).subscribe({
        next: (results) => {
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

          this.searchResults.set(searchResults);
          this.allMatchedPages = searchResults.map(r => r.pid);

          // IMPORTANT: Set the search query in the service to show search navigation
          // This is normally done in displaySearchHighlights, but we need it set
          // even if the current page doesn't have matches
          this.iiifViewerService.setSearchQuery(this.lastSearchTerm);
          // Find current page in results
          const currentPid = this.detailViewService.currentPagePid;
          if (currentPid) {
            this.currentMatchedPageIndex = this.allMatchedPages.indexOf(currentPid);

            // If current page has matches, display ALTO highlights
            if (this.currentMatchedPageIndex !== -1) {
              setTimeout(() => {
                this.fetchAndDisplayResults(currentPid, this.lastSearchTerm);
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

  get isSoundRecording(): boolean {
    return this.document?.model === DocumentTypeEnum.soundrecording;
  }

  get shouldShowPageNavigator(): boolean {
    if (this.isSoundRecording) {
      return this.detailViewService.soundRecordingViewMode() === 'images';
    }
    return true;
  }

  get gridType(): 'recording' | 'page' {
    return this.isSoundRecording ? 'recording' : 'page';
  }

  /**
   * Gets the current page number (1-indexed) for display
   */
  getCurrentMatchedPageNumber(): number {
    return this.currentMatchedPageIndex + 1;
  }

  /**
   * Gets the total number of pages with matches
   */
  getTotalMatchedPages(): number {
    return this.allMatchedPages.length;
  }

  /**
   * Gets autocomplete suggestions for in-document search
   * This function is passed to the autocomplete component
   * NOTE: This only fetches suggestions for the dropdown, NOT the full search results
   */
  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.document?.uuid || !term || term.trim().length < 2) {
      console.log('Skipping suggestions - invalid term or no document UUID');
      return of([]);
    }
    // Store the term the user typed
    this.lastSearchTerm = term;

    return this.solrService.getInDocumentSuggestions(this.document.uuid, term).pipe(
      map(results => {
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
  };

  /**
   * Handles when a user selects a suggestion from the autocomplete
   * Fetches full search results and displays them in the search results list
   */
  onSuggestionSelected(suggestion: string): void {
    const pid = this.suggestionToPidMap.get(suggestion);

    if (!pid || !this.lastSearchTerm || !this.document?.uuid) {
      console.warn('No PID found, no search term, or no document UUID:', {
        pid,
        term: this.lastSearchTerm,
        documentUuid: this.document?.uuid
      });
      return;
    }

    // Set the search term for tracking (use the original term the user typed)
    this.searchTerm.set(this.lastSearchTerm);

    // Update URL with fulltext parameter
    this.detailViewService.setFulltextParam(this.lastSearchTerm);

    // Fetch full search results with highlighted snippets
    this.solrService.getInDocumentSearchResults(this.document.uuid, this.lastSearchTerm).subscribe({
      next: (results) => {
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

        this.searchResults.set(searchResults);
        this.allMatchedPages = searchResults.map(r => r.pid);
        this.currentMatchedPageIndex = this.allMatchedPages.indexOf(pid);

        // Navigate to the selected page
        this.detailViewService.navigateToPage(pid);

        // Wait a bit for the page to load, then display ALTO highlights
        setTimeout(() => {
          this.fetchAndDisplayResults(pid, this.lastSearchTerm);
        }, 100);
      },
      error: (error) => {
        console.error('Error fetching search results:', error);
      }
    });
  }

  /**
   * Fetches ALTO XML and displays search results for a given page
   * @param pid - Page PID
   * @param searchTerm - Search term to highlight
   * @param shouldClearInput - Whether to clear the input after displaying (default: false)
   */
  private fetchAndDisplayResults(pid: string, searchTerm: string, shouldClearInput: boolean = false): void {
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

        // Only clear the autocomplete input if explicitly requested
        // (not when restoring from URL or navigating between results)
        if (shouldClearInput) {
          setTimeout(() => {
            this.searchTerm.set('');
          }, 500);
        }
      },
      error: (error) => {
        console.error('Error fetching ALTO XML for PID:', pid, error);
      }
    });
  }

  onAutocompleteClear() {
    this.searchTerm.set('');
    this.lastSearchTerm = this.searchTerm();
    this.iiifViewerService.clearSearch();
  }

  /**
   * Handles search submission (when user presses enter)
   * Searches on the current page only (not across all pages)
   */
  onSearch(term: string): void {
    console.log('onSearch called with term:', term);

    this.searchTerm.set(term);
    this.lastSearchTerm = term;

    if (!term || !this.detailViewService.currentPagePid) {
      // Clear overlays if search is cleared
      if (!term) {
        console.log('Clearing search');
        this.iiifViewerService.clearSearch();
        this.allMatchedPages = [];
        this.currentMatchedPageIndex = 0;
        this.searchResults.set([]);
        // Remove fulltext parameter from URL
        this.detailViewService.setFulltextParam(null);
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
    this.currentMatchedPageIndex = 0;

    // Fetch ALTO for current page and display results
    this.fetchAndDisplayResults(this.detailViewService.currentPagePid, term);
  }

  /**
   * Navigate to the next page with matches
   */
  findNextMatch(): void {
    if (this.allMatchedPages.length === 0) {
      return;
    }

    // Move to next page with matches
    this.currentMatchedPageIndex = (this.currentMatchedPageIndex + 1) % this.allMatchedPages.length;
    const nextPid = this.allMatchedPages[this.currentMatchedPageIndex];

    console.log('⏭️ Navigating to next matched page:', {
      pageIndex: this.currentMatchedPageIndex + 1,
      totalPages: this.allMatchedPages.length,
      pid: nextPid
    });

    // Navigate to the page
    this.detailViewService.navigateToPage(nextPid);

    // Wait for page to load, then display results
    setTimeout(() => {
      this.fetchAndDisplayResults(nextPid, this.lastSearchTerm);
    }, 100);
  }

  /**
   * Navigate to the previous page with matches
   */
  findPreviousMatch(): void {
    if (this.allMatchedPages.length === 0) {
      return;
    }

    // Move to previous page with matches
    this.currentMatchedPageIndex = (this.currentMatchedPageIndex - 1 + this.allMatchedPages.length) % this.allMatchedPages.length;
    const prevPid = this.allMatchedPages[this.currentMatchedPageIndex];

    console.log('Navigating to previous matched page:', {
      pageIndex: this.currentMatchedPageIndex + 1,
      totalPages: this.allMatchedPages.length,
      pid: prevPid
    });

    // Navigate to the page
    this.detailViewService.navigateToPage(prevPid);

    // Wait for page to load, then display results
    setTimeout(() => {
      this.fetchAndDisplayResults(prevPid, this.lastSearchTerm);
    }, 100);
  }

  /**
   * Handles when user clicks on a search result in the list
   */
  onSearchResultClick(result: SearchResult): void {
    console.log('Search result clicked:', result.pid);

    // Find the index of this page
    this.currentMatchedPageIndex = this.allMatchedPages.indexOf(result.pid);

    // Navigate to the page
    this.detailViewService.navigateToPage(result.pid);

    // Wait for page to load, then display ALTO highlights
    setTimeout(() => {
      this.fetchAndDisplayResults(result.pid, this.lastSearchTerm);
    }, 100);
  }
}

