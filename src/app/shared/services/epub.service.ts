import { Injectable } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';
import { NavItem } from 'epubjs';

@Injectable({
  providedIn: 'root'
})
export class EpubService {
  // Holds the parsed Table of Contents (TOC) structure from epub.js
  private tocSubject = new BehaviorSubject<NavItem[]>([]);
  public toc$ = this.tocSubject.asObservable();

  // Emits navigation events triggered from the sidebar to be handled by the viewer
  private navigateSubject = new Subject<string>();
  public navigate$ = this.navigateSubject.asObservable();

  // Pagination State
  private currentPageSubject = new BehaviorSubject<number>(1);
  public currentPage$ = this.currentPageSubject.asObservable();

  private totalPagesSubject = new BehaviorSubject<number>(0);
  public totalPages$ = this.totalPagesSubject.asObservable();

  // Active Chapter State
  private activeHrefSubject = new BehaviorSubject<string>('');
  public activeHref$ = this.activeHrefSubject.asObservable();

  // Search State
  private searchQuerySubject = new BehaviorSubject<string>('');
  public searchQuery$ = this.searchQuerySubject.asObservable();

  private isSearchingSubject = new BehaviorSubject<boolean>(false);
  public isSearching$ = this.isSearchingSubject.asObservable();

  private searchResultsSubject = new BehaviorSubject<any[]>([]);
  public searchResults$ = this.searchResultsSubject.asObservable();

  private currentMatchIndexSubject = new BehaviorSubject<number>(0);
  public currentMatchIndex$ = this.currentMatchIndexSubject.asObservable();

  // Emits generic control actions from ViewerControls
  private controlSubject = new Subject<{action: string, data?: any}>();
  public control$ = this.controlSubject.asObservable();

  constructor() {}

  /**
   * Stores the parsed TOC from the ePub engine.
   * @param toc The extracted Table of Contents hierarchical array
   */
  setToc(toc: NavItem[]): void {
    this.tocSubject.next(toc);
  }

  /**
   * Retrieves the current TOC data synchronously.
   */
  getToc(): NavItem[] {
    return this.tocSubject.getValue();
  }

  /**
   * Triggers a navigation event for the EPUB viewer handling engine to intercept.
   * @param href The chapter/section href to render
   */
  navigateTo(href: string): void {
    if (href) {
      this.navigateSubject.next(href);
    }
  }

  setPageParams(current: number, total: number): void {
    this.currentPageSubject.next(current);
    this.totalPagesSubject.next(total);
  }

  setActiveHref(href: string): void {
    this.activeHrefSubject.next(href);
  }

  setSearchQuery(query: string): void {
    this.searchQuerySubject.next(query);
  }

  setIsSearching(isSearching: boolean): void {
    this.isSearchingSubject.next(isSearching);
  }

  setSearchResults(results: any[]): void {
    this.searchResultsSubject.next(results);
    this.currentMatchIndexSubject.next(results.length > 0 ? 1 : 0);
  }

  setSearchMatchIndex(index: number): void {
    this.currentMatchIndexSubject.next(index);
  }

  nextSearchResult(): void {
    const total = this.searchResultsSubject.value.length;
    const current = this.currentMatchIndexSubject.value;
    if (total > 0 && current < total) {
      this.currentMatchIndexSubject.next(current + 1);
      this.triggerNavigationToCurrentMatch();
    }
  }

  prevSearchResult(): void {
    const total = this.searchResultsSubject.value.length;
    const current = this.currentMatchIndexSubject.value;
    if (total > 0 && current > 1) {
      this.currentMatchIndexSubject.next(current - 1);
      this.triggerNavigationToCurrentMatch();
    }
  }

  private triggerNavigationToCurrentMatch(): void {
    const results = this.searchResultsSubject.value;
    const currentIdx = this.currentMatchIndexSubject.value;
    if (results.length > 0 && currentIdx > 0 && currentIdx <= results.length) {
      const match = results[currentIdx - 1]; // 1-indexed to 0-indexed
      // Dispatch a generic control event to EpubViewer to render the CFI
      this.controlSubject.next({ action: 'gotoCFI', data: match.cfi });
    }
  }

  // Actions triggered by ViewerControls or Sidebar to be handled by the Renderer
  zoomIn(): void { this.controlSubject.next({ action: 'zoomIn' }); }
  zoomOut(): void { this.controlSubject.next({ action: 'zoomOut' }); }
  toggleFullscreen(): void { this.controlSubject.next({ action: 'fullscreen' }); }
  toggleBookMode(): void { this.controlSubject.next({ action: 'bookMode' }); }
  goToNext(): void { this.controlSubject.next({ action: 'nextPage' }); }
  goToPrevious(): void { this.controlSubject.next({ action: 'prevPage' }); }
  goToPage(page: number): void { this.controlSubject.next({ action: 'gotoPage', data: page }); }

  /**
   * Reset states when a document is closed/unloaded.
   */
  clear(): void {
    this.tocSubject.next([]);
    this.currentPageSubject.next(1);
    this.totalPagesSubject.next(0);
    this.searchQuerySubject.next('');
    this.activeHrefSubject.next('');
    this.isSearchingSubject.next(false);
    this.searchResultsSubject.next([]);
    this.currentMatchIndexSubject.next(0);
  }
}
