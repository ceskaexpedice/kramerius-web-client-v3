import { Component, inject, Input, signal } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { InputComponent } from '../input/input.component';
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

@Component({
  selector: 'app-document-sidebar',
  imports: [
    NgIf,
    TranslateModule,
    InputComponent,
    PageNavigatorComponent,
    AdminActionsComponent,
    DetailPagesGridComponent,
    AutocompleteComponent
  ],
  templateUrl: './document-sidebar.component.html',
  styleUrl: './document-sidebar.component.scss'
})
export class DocumentSidebarComponent {
  @Input() document!: Metadata;

  public detailViewService = inject(DetailViewService);
  public selectionService = inject(SelectionService);
  private solrService = inject(SolrService);
  private altoService = inject(AltoService); // Still needed for fetching ALTO XML
  private iiifViewerService = inject(IIIFViewerService);

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  // Search state
  public searchTerm = signal('');
  private suggestionToPidMap = new Map<string, string>();

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
   * Gets autocomplete suggestions for in-document search
   * This function is passed to the autocomplete component
   */
  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.document?.uuid || !term || term.trim().length < 2) {
      return of([]);
    }

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
   * Fetches ALTO XML and displays rectangles on the image
   */
  onSuggestionSelected(suggestion: string): void {
    const pid = this.suggestionToPidMap.get(suggestion);

    if (!pid || !this.searchTerm()) {
      console.warn('No PID found for suggestion or no search term', {
        pid,
        searchTerm: this.searchTerm(),
        suggestion
      });
      return;
    }

    console.log('Selected suggestion, navigating to page:', { pid, searchTerm: this.searchTerm() });

    // Navigate to the selected page
    this.detailViewService.navigateToPage(pid);

    setTimeout(() => {
      this.fetchAndDisplayResults(pid, this.searchTerm());
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
        const count = this.iiifViewerService.displaySearchHighlights(altoXml, searchTerm);
        if (count > 0) {
          console.log(`✅ Successfully displayed ${count} search result rectangles`);
        } else if (count === 0) {
          console.warn('⚠️ No matches found for search term:', searchTerm);
        } else {
          console.error('❌ Failed to display search results');
        }
      },
      error: (error) => {
        console.error('Error fetching ALTO XML for PID:', pid, error);
      }
    });
  }

  /**
   * Handles search submission (when user presses enter)
   * Searches on the current page
   */
  onSearch(term: string): void {
    this.searchTerm.set(term);

    if (!term || !this.detailViewService.currentPagePid) {
      // Clear overlays if search is cleared
      if (!term) {
        this.iiifViewerService.clearAllOverlays();
      }
      return;
    }

    console.log('Searching on current page:', {
      term,
      currentPagePid: this.detailViewService.currentPagePid
    });

    // Fetch ALTO for current page and display results
    this.fetchAndDisplayResults(this.detailViewService.currentPagePid, term);
  }
}
