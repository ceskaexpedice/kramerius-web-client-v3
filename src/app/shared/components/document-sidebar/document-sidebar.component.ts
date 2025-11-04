import { Component, inject, Input, signal } from '@angular/core';
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
    SearchNavigationComponent
  ],
  templateUrl: './document-sidebar.component.html',
  styleUrl: './document-sidebar.component.scss'
})
export class DocumentSidebarComponent {
  @Input() document!: Metadata;

  public detailViewService = inject(DetailViewService);
  public selectionService = inject(SelectionService);
  public iiifViewerService = inject(IIIFViewerService);
  private solrService = inject(SolrService);
  private altoService = inject(AltoService);

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  // Search state
  public searchTerm = signal('');
  private suggestionToPidMap = new Map<string, string>();
  private lastSearchTerm = ''; // The actual term the user typed
  private allMatchedPages: string[] = []; // All PIDs with matches from suggestions
  private currentMatchedPageIndex = 0; // Current index in allMatchedPages

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
   */
  getSuggestionsFn = (term: string): Observable<string[]> => {
    console.log('🔍 getSuggestionsFn called with term:', term);

    if (!this.document?.uuid || !term || term.trim().length < 2) {
      console.log('❌ Skipping suggestions - invalid term or no document UUID');
      return of([]);
    }

    console.log('📡 Fetching suggestions for document:', this.document.uuid);

    // Store the term the user typed
    this.lastSearchTerm = term;

    return this.solrService.getInDocumentSuggestions(this.document.uuid, term).pipe(
      map(results => {
        console.log('✅ Received suggestions:', results.length, 'pages with matches');

        // Clear previous mapping
        this.suggestionToPidMap.clear();
        this.allMatchedPages = [];

        // Build suggestions array and store PID mapping
        return results.map(result => {
          // Remove the highlighting markers (>> <<) for display
          const cleanText = result.highlights[0]?.replace(/>>|<</g, '').trim() || '';
          const suggestion = `${cleanText}`;

          // Store the PID for this suggestion
          this.suggestionToPidMap.set(suggestion, result.pid);
          this.allMatchedPages.push(result.pid);

          return suggestion;
        });
      })
    );
  };

  /**
   * Handles when a user selects a suggestion from the autocomplete
   * Fetches ALTO XML and displays rectangles on the image
   */
  onSuggestionSelected(suggestion: string): void {
    console.log('📌 Suggestion selected:', suggestion);

    const pid = this.suggestionToPidMap.get(suggestion);

    if (!pid || !this.lastSearchTerm) {
      console.warn('❌ No PID found or no search term:', { pid, term: this.lastSearchTerm });
      return;
    }

    // Find the index of this page in allMatchedPages
    this.currentMatchedPageIndex = this.allMatchedPages.indexOf(pid);

    console.log('✅ Navigating to page:', {
      pid,
      searchTerm: this.lastSearchTerm,
      pageIndex: this.currentMatchedPageIndex + 1,
      totalPages: this.allMatchedPages.length
    });

    // Set the search term for tracking (use the original term the user typed)
    this.searchTerm.set(this.lastSearchTerm);

    // Navigate to the selected page
    this.detailViewService.navigateToPage(pid);

    // Wait a bit for the page to load, then display results
    setTimeout(() => {
      this.fetchAndDisplayResults(pid, this.lastSearchTerm);
    }, 100);
  }

  /**
   * Fetches ALTO XML and displays search results for a given page
   * @param pid - Page PID
   * @param searchTerm - Search term to highlight
   */
  private fetchAndDisplayResults(pid: string, searchTerm: string): void {
    this.altoService.fetchAltoXml(pid).subscribe({
      next: (altoXml) => {
        console.log('fetchAndDisplayResults:', altoXml);
        const count = this.iiifViewerService.displaySearchHighlights(altoXml, searchTerm);
        if (count > 0) {
          console.log(`✅ Successfully displayed ${count} search result rectangles on this page`);
        } else if (count === 0) {
          console.warn('⚠️ No matches found for search term on this page:', searchTerm);
        } else {
          console.error('❌ Failed to display search results');
        }

        // Clear the autocomplete input after a delay to allow for new searches
        // This gives the user time to see the result, then allows them to type a new term
        setTimeout(() => {
          this.searchTerm.set('');
        }, 500);
      },
      error: (error) => {
        console.error('Error fetching ALTO XML for PID:', pid, error);
      }
    });
  }

  /**
   * Handles search submission (when user presses enter)
   * Searches on the current page only (not across all pages)
   */
  onSearch(term: string): void {
    console.log('🔎 onSearch called with term:', term);

    this.searchTerm.set(term);
    this.lastSearchTerm = term;

    if (!term || !this.detailViewService.currentPagePid) {
      // Clear overlays if search is cleared
      if (!term) {
        console.log('🧹 Clearing search');
        this.iiifViewerService.clearSearch();
        this.allMatchedPages = [];
        this.currentMatchedPageIndex = 0;
      }
      return;
    }

    console.log('🔎 Searching on current page only:', {
      term,
      currentPagePid: this.detailViewService.currentPagePid
    });

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

    console.log('⏮️ Navigating to previous matched page:', {
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
}
