import {Component, inject, Input, OnInit, OnChanges, SimpleChanges, signal, effect, OnDestroy} from '@angular/core';
import { NgIf, AsyncPipe } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { PageNavigatorComponent } from '../page-navigator/page-navigator.component';
import { AdminActionsComponent } from '../admin-actions/admin-actions.component';
import { DetailPagesGridComponent } from '../../../modules/detail-view-page/components/detail-pages-grid/detail-pages-grid.component';
import { DetailArticlesListComponent } from '../../../modules/detail-view-page/components/detail-articles-list/detail-articles-list.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { Metadata } from '../../models/metadata.model';
import { SelectionService } from '../../services';
import { AutocompleteComponent } from '../autocomplete/autocomplete.component';
import { IIIFViewerService } from '../../services/iiif-viewer.service';
import { Observable } from 'rxjs';
import { SearchNavigationComponent } from '../search-navigation/search-navigation.component';
import { SearchResultsListComponent, SearchResult } from '../search-results-list/search-results-list.component';
import { DocumentSearchService } from '../../services/document-search.service';
import {MatSlideToggle} from '@angular/material/slide-toggle';
import {FormsModule} from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-document-sidebar',
  imports: [
    NgIf,
    AsyncPipe,
    TranslateModule,
    PageNavigatorComponent,
    AdminActionsComponent,
    DetailPagesGridComponent,
    DetailArticlesListComponent,
    AutocompleteComponent,
    SearchNavigationComponent,
    SearchResultsListComponent,
    MatSlideToggle,
    FormsModule,
  ],
  templateUrl: './document-sidebar.component.html',
  styleUrl: './document-sidebar.component.scss'
})
export class DocumentSidebarComponent implements OnInit, OnChanges, OnDestroy {
  @Input() document!: Metadata;
  @Input() mode?: 'pages' | 'articles';

  public detailViewService = inject(DetailViewService);
  public selectionService = inject(SelectionService);
  public iiifViewerService = inject(IIIFViewerService);
  public documentSearchService = inject(DocumentSearchService);

  // Local signal that syncs with the service's observable for the autocomplete component
  public searchTerm = signal('');
  public showAllPages = false;

  // Convert searchQuery$ observable to a signal for reactive checks
  public searchQuery = toSignal(this.iiifViewerService.searchQuery$, { initialValue: null });

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  constructor() {
    // Sync the local signal with the service's observable
    this.documentSearchService.searchTerm$.subscribe(term => {
      this.searchTerm.set(term);
    });
  }

  ngOnInit(): void {
    // Check for fulltext parameter in URL on component initialization
    if (this.document?.uuid) {
      this.documentSearchService.restoreSearchFromUrl(this.document.uuid);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // When document changes, reset restoration flag and check if we need to restore search
    if (changes['document'] && !changes['document'].firstChange && this.document?.uuid) {
      this.documentSearchService.resetRestorationFlag();
      this.documentSearchService.restoreSearchFromUrl(this.document.uuid);
    }
  }

  ngOnDestroy(): void {
    this.documentSearchService.clearSearch();
  }

  get isSoundRecording(): boolean {
    return this.document?.model === DocumentTypeEnum.soundrecording;
  }

  get shouldShowPageNavigator(): boolean {
    if (this.searchQuery() && !this.showAllPages) return false;

    // Don't show page navigator when PDF articles are displayed
    if (this.detailViewService.isPdf) return false;

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
    return this.documentSearchService.getCurrentMatchNumber();
  }

  /**
   * Gets the total number of pages with matches
   */
  getTotalMatchedPages(): number {
    return this.documentSearchService.getTotalMatchedPages();
  }

  /**
   * Gets autocomplete suggestions for in-document search
   * This function is passed to the autocomplete component
   */
  getSuggestionsFn = (term: string): Observable<string[]> => {
    if (!this.document?.uuid) {
      return this.documentSearchService.getSuggestions('', term);
    }
    return this.documentSearchService.getSuggestions(this.document.uuid, term);
  };

  /**
   * Handles when a user selects a suggestion from the autocomplete
   */
  onSuggestionSelected(suggestion: string): void {
    console.log('onSuggestionSelected', suggestion);
    if (!this.document?.uuid) {
      return;
    }
    this.documentSearchService.selectSuggestion(this.document.uuid, suggestion);
  }

  caseSensitiveChanged() {
    this.documentSearchService.caseSensitiveChanged(this.document.uuid, this.searchTerm())
  }

  /**
   * Handles when autocomplete is cleared
   */
  onAutocompleteClear(): void {
    this.documentSearchService.clearSearch();
  }

  /**
   * Handles search submission (when user presses enter)
   */
  onSearch(term: string): void {
    if (!this.document?.uuid) {
      return;
    }
    this.documentSearchService.selectSuggestion(this.document.uuid, term);
  }

  /**
   * Navigate to the next page with matches
   */
  findNextMatch(): void {
    this.documentSearchService.navigateToNextMatch();
  }

  /**
   * Navigate to the previous page with matches
   */
  findPreviousMatch(): void {
    this.documentSearchService.navigateToPreviousMatch();
  }

  /**
   * Handles when user clicks on a search result in the list
   */
  onSearchResultClick(result: SearchResult): void {
    this.documentSearchService.navigateToResult(result);
  }

  onShowAllPagesToggle() {

  }
}
