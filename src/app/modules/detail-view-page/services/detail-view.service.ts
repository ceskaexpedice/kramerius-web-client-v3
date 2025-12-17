import { inject, Injectable, signal } from '@angular/core';
import { Page } from '../../../shared/models/page.model';
import { Store } from '@ngrx/store';
import { ActivatedRoute, Router } from '@angular/router';
import { APP_ROUTES_ENUM } from '../../../app.routes';
import {
  selectDocumentDetail,
  selectDocumentDetailError,
  selectDocumentDetailLoading,
  selectDocumentDetailOnlyRecordings,
  selectDocumentDetailPages,
} from '../../../shared/state/document-detail/document-detail.selectors';
import { loadDocumentDetail } from '../../../shared/state/document-detail/document-detail.actions';
import { filter, Observable, skip, take } from 'rxjs';
import {
  selectAvailableYears,
  selectPeriodicalChildren,
  selectPidFromAvailableYears,
} from '../../periodical/state/periodical-detail/periodical-detail.selectors';
import { RecordInfoService } from '../../../shared/services/record-info.service';
import { Metadata } from '../../../shared/models/metadata.model';
import { SoundRecordGridControl } from '../../../shared/components/toolbar-controls/toolbar-controls.component';
import { toSignal } from '@angular/core/rxjs-interop';
import { DocumentTypeEnum } from '../../constants/document-type';
import { loadPeriodical, loadPeriodicalItems } from '../../periodical/state/periodical-detail/periodical-detail.actions';
import { SolrSortDirections, SolrSortFields } from '../../../core/solr/solr-helpers';
import { IIIFViewerService } from '../../../shared/services/iiif-viewer.service';
import { DocumentInfoService } from '../../../shared/services/document-info.service';
import { BreakpointService } from '../../../shared/services/breakpoint.service';
import { UiStateService } from '../../../shared/services/ui-state.service';

@Injectable({
  providedIn: 'root'
})
export class DetailViewService {
  private breakpointService = inject(BreakpointService);

  _currentPageIndex = signal<number>(0);
  _pages = signal<Page[]>([]);

  soundRecordingViewMode = signal<SoundRecordGridControl>('records');

  private store = inject(Store);
  private recordInfoService = inject(RecordInfoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private iiifViewerService = inject(IIIFViewerService);
  private documentInfoService = inject(DocumentInfoService);
  private uiStateService = inject(UiStateService);

  pages$ = this.store.select(selectDocumentDetailPages);
  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);

  private documentSignal = toSignal(this.document$, { initialValue: null });

  constructor() {
    // Initialize sidebar state based on device type if not already set by user interaction
    if (!this.breakpointService.isMobile()) {
      this.uiStateService.setMetadataSidebarState(true);
    } else {
      this.uiStateService.setMetadataSidebarState(false);
    }

    // Listen to pages changes and update the signal automatically
    this.pages$.subscribe(pages => {
      if (pages) {
        this._pages.set(pages);
        this._currentPageIndex.set(0);

        // After pages are loaded, check if there's a page parameter in URL
        this.checkAndSetCurrentPageFromUrl();
      }
    });
  }

  private _viewerMode = signal<'page' | 'audio' | 'article' | 'image'>('page');

  setSoundRecordingViewView(view: any): void {
    this.soundRecordingViewMode.set(view);
  }

  get document(): Metadata | null {
    return this.documentSignal();
  }

  get pages() {
    return this._pages();
  }

  get currentPageIndex() {
    return this._currentPageIndex();
  }

  get totalPages(): number {
    return this._pages().length;
  }

  get viewerMode() {
    return this._viewerMode();
  }

  get currentPagePid(): string | null {
    const currentPage = this.getCurrentPage();
    return currentPage ? currentPage.pid : null;
  }

  get metadataSidebarVisible(): boolean {
    return this.uiStateService.metadataSidebarOpen();
  }

  get title(): string {
    // if model is soundrecording return title · author[0] · year
    if (this.document?.model === DocumentTypeEnum.soundrecording) {
      const title = this.document.mainTitle;
      const author = this.document.authors[0]?.name || '';
      const year = this.document.dateStr || '';

      return `${title} · ${author} · ${year}`;
    }

    return this.document?.mainTitle || '';
  }

  loadDocument() {
    this.store.dispatch(loadDocumentDetail({}));

    this.document$.pipe(
      skip(1),
      take(1)
    ).subscribe((doc) => {
      console.log('Document loaded:', doc);
      this.loadPages();

      // If document is from a periodical, proactively load periodical children data
      if (doc?.rootModel === DocumentTypeEnum.periodical || doc?.model === DocumentTypeEnum.periodicalitem) {
        this.loadPeriodicalChildren(doc);
      }
    });
  }

  private loadPeriodicalChildren(doc: any) {
    if (doc?.rootModel === DocumentTypeEnum.periodical || doc?.model === DocumentTypeEnum.periodicalitem) {

      // Fallback: If document is directly a periodicalitem, try to get parent info
      if (doc?.model === DocumentTypeEnum.periodicalitem && doc?.ownParentPid) {
        this.store.dispatch(loadPeriodicalItems({
          parentVolumeUuid: doc.ownParentPid
        }));

        return;
      }

      // Default fallback: Load entire periodical structure
      const rootPid = doc?.rootPid || doc?.uuid;
      if (rootPid) {
        this.store.dispatch(loadPeriodical({
          uuid: rootPid,
          filters: [],
          advancedQuery: '',
          page: 0,
          pageCount: 1000,
          sortBy: SolrSortFields.relevance,
          sortDirection: SolrSortDirections.asc
        }));
      }
    }
  }

  loadPages() {
    this.store.select(selectDocumentDetailPages)
      .pipe(take(1))
      .subscribe(pages => {
        const safePages = pages ?? [];
        this._pages.set(safePages);
        this._currentPageIndex.set(0);

        if (this.document?.model !== DocumentTypeEnum.soundrecording) {
          this.checkAndSetCurrentPageFromUrl();
        }

        // Load page info for the initial/current page
        this.loadPageInfo();
      });
  }

  getSoundRecordings(): Observable<Page[] | undefined> {
    // selectDocumentDetailOnlyRecordings
    return this.store.select(selectDocumentDetailOnlyRecordings);
  }

  checkAndSetCurrentPageFromUrl() {
    // Check if there is a page parameter in the URL
    const pageParam = this.route.snapshot.queryParams['page'];

    if (pageParam) {
      const pageIndex = this._pages().findIndex(page => page.pid === pageParam);

      if (pageIndex !== -1) {
        this._currentPageIndex.set(pageIndex);
      }
    } else {
      console.log('checkAndSetCurrentPageFromUrl - no page param, staying at index 0');
      // add first page as param
      const isMonographUnit = this.pages.some(page => page.model === DocumentTypeEnum.monographunit || page.model === DocumentTypeEnum.periodicalvolume || page.model === DocumentTypeEnum.periodicalitem);
      if (this._pages().length > 0 && !isMonographUnit) {
        this._currentPageIndex.set(0);
        this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { page: this.pages[0].pid },
          queryParamsHandling: "merge",
          replaceUrl: true
        })
      }
    }
  }

  setPages(pages: Page[]) {
    this._pages.set(pages);
    this._currentPageIndex.set(0);
  }

  setViewerMode(mode: 'page' | 'audio' | 'article' | 'image') {
    this._viewerMode.set(mode);
  }

  goToPage(index: number) {
    if (index >= 0 && index < this._pages().length) {
      this._currentPageIndex.set(index);

      if (this.document?.model === DocumentTypeEnum.soundrecording && this.soundRecordingViewMode() === 'records') {
        this.soundRecordingViewMode.set('images');
      }

      this.changePageUrl();
    }
  }

  /**
   * Navigates to a specific page by its PID
   * @param pid - Page PID to navigate to
   */
  navigateToPage(pid: string): void {
    const pages = this._pages();
    const pageIndex = pages.findIndex(page => page.pid === pid);

    if (pageIndex !== -1) {
      this.goToPage(pageIndex);
    } else {
      console.warn(`Page with PID ${pid} not found in pages array`);
    }
  }

  changePageUrl() {
    const currentPage = this.getCurrentPage();
    // add to url ?page=PAGE_PID

    if (currentPage) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', currentPage.pid);
      window.history.replaceState({}, '', url.toString());

      // Fetch page info from API
      this.loadPageInfo();
    }
  }

  /**
   * Loads page info for the current page from the API
   */
  private loadPageInfo() {
    const currentPage = this.getCurrentPage();
    if (!currentPage) {
      this.documentInfoService.clearPageInfo();
      return;
    }

    this.documentInfoService.loadPageInfo(currentPage.pid);
  }

  /**
   * Updates the fulltext query parameter in the URL
   * @param searchTerm - The search term to add to the URL, or null to remove it
   */
  setFulltextParam(searchTerm: string | null): void {
    const url = new URL(window.location.href);

    if (searchTerm && searchTerm.trim().length > 0) {
      url.searchParams.set('fulltext', searchTerm.trim());
    } else {
      url.searchParams.delete('fulltext');
    }

    window.history.replaceState({}, '', url.toString());
  }

  goToNext(pagesToGoForward?: number) {
    // If book mode is active and no explicit step is provided, move by 2
    const step = pagesToGoForward ?? (this.iiifViewerService.isBookMode() ? 2 : 1);
    this.goToPage(this._currentPageIndex() + step);
  }

  goToPrevious(pagesToGoBack?: number) {
    // If book mode is active and no explicit step is provided, move by 2
    const step = pagesToGoBack ?? (this.iiifViewerService.isBookMode() ? 2 : 1);
    this.goToPage(this._currentPageIndex() - step);
  }

  goToNextPeriodicalIssue() {
    const currentDoc = this.document;
    if (!currentDoc?.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      const currentIndex = children.findIndex(child => child.pid === currentDoc.uuid);

      if (currentIndex !== -1 && currentIndex < children.length - 1) {
        // Navigate to next issue in current volume
        const nextIssue = children[currentIndex + 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, nextIssue.pid]);
      } else if (currentIndex === children.length - 1) {
        // At last issue of volume, try to navigate to first issue of next volume
        this.navigateToNextVolume();
      }
    });
  }

  private navigateToNextVolume() {
    const currentDoc = this.document;
    if (!currentDoc?.ownParentPid) {
      console.warn('Cannot navigate to next volume: no parent volume information');
      return;
    }

    this.store.select(selectAvailableYears).pipe(take(1)).subscribe(availableYears => {
      if (!availableYears || availableYears.length === 0) {
        console.warn('Cannot navigate to next volume: no available years data');
        return;
      }

      // Find current volume in available years
      const currentVolumeIndex = availableYears.findIndex(
        year => year.pid === currentDoc.ownParentPid
      );

      if (currentVolumeIndex === -1) {
        console.warn('Cannot navigate to next volume: current volume not found in available years');
        return;
      }

      if (currentVolumeIndex >= availableYears.length - 1) {
        console.log('Already at last volume');
        return;
      }

      // Get next volume
      const nextVolume = availableYears[currentVolumeIndex + 1];

      // Load issues for next volume
      this.store.dispatch(loadPeriodicalItems({
        parentVolumeUuid: nextVolume.pid
      }));

      // Wait for NEW issues to load (skip current emission), then navigate to first issue
      this.store.select(selectPeriodicalChildren).pipe(
        skip(1), // Skip the current volume's children
        filter(children => children && children.length > 0),
        take(1)
      ).subscribe(children => {
        // Navigate to first issue of next volume
        const firstIssue = children[0];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, firstIssue.pid]);
      });
    });
  }

  goToPreviousPeriodicalIssue() {
    const currentDoc = this.document;
    if (!currentDoc?.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      const currentIndex = children.findIndex(child => child.pid === currentDoc.uuid);

      if (currentIndex > 0) {
        // Navigate to previous issue in current volume
        const previousIssue = children[currentIndex - 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, previousIssue.pid]);
      } else if (currentIndex === 0) {
        // At first issue of volume, try to navigate to last issue of previous volume
        this.navigateToPreviousVolume();
      }
    });
  }

  private navigateToPreviousVolume() {
    const currentDoc = this.document;
    if (!currentDoc?.ownParentPid) {
      console.warn('Cannot navigate to previous volume: no parent volume information');
      return;
    }

    this.store.select(selectAvailableYears).pipe(take(1)).subscribe(availableYears => {
      if (!availableYears || availableYears.length === 0) {
        console.warn('Cannot navigate to previous volume: no available years data');
        return;
      }

      // Find current volume in available years
      const currentVolumeIndex = availableYears.findIndex(
        year => year.pid === currentDoc.ownParentPid
      );

      if (currentVolumeIndex === -1) {
        console.warn('Cannot navigate to previous volume: current volume not found in available years');
        return;
      }

      if (currentVolumeIndex <= 0) {
        console.log('Already at first volume');
        return;
      }

      // Get previous volume
      const previousVolume = availableYears[currentVolumeIndex - 1];

      // Load issues for previous volume
      this.store.dispatch(loadPeriodicalItems({
        parentVolumeUuid: previousVolume.pid
      }));

      // Wait for NEW issues to load (skip current emission), then navigate to last issue
      this.store.select(selectPeriodicalChildren).pipe(
        skip(1), // Skip the current volume's children
        filter(children => children && children.length > 0),
        take(1)
      ).subscribe(children => {
        // Navigate to last issue of previous volume
        const lastIssue = children[children.length - 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, lastIssue.pid]);
      });
    });
  }


  getCurrentPage(): Page | null {
    const pages = this._pages();
    return pages[this._currentPageIndex()] ?? null;
  }

  getCurrentPageDate(): string | null {
    const currentPage = this.getCurrentPage();
    if (currentPage && currentPage['date.str']) {
      return currentPage['date.str'];
    }
    return null;
  }

  openRecordInfo() {
    this.document$.pipe(take(1)).subscribe((doc: Metadata | null) => {
      if (!doc) return;

      const uuid = doc?.uuid;
      if (uuid) {
        this.recordInfoService.openRecordInfoDialog(uuid);
      }
    });
  }

  navigateToDate(pid: string, year?: number) {
    if (year && this.needsYearDataLoading(year)) {
      this.loadYearDataAndNavigate(pid, year);
    } else {
      this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
    }
  }

  private needsYearDataLoading(targetYear: number): boolean {
    const currentLoadedYear = this.getCurrentLoadedYear();
    return currentLoadedYear !== null && currentLoadedYear !== targetYear;
  }

  private getCurrentLoadedYear(): number | null {
    let currentYear: number | null = null;
    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      if (children && children.length > 0) {
        // Get year from first child's date
        const firstChild = children[0];
        if (firstChild['date.str']) {
          const dateParts = firstChild['date.str'].split('.');
          if (dateParts.length >= 3) {
            currentYear = parseInt(dateParts[2], 10);
          }
        }
      }
    });
    return currentYear;
  }

  private loadYearDataAndNavigate(pid: string, year: number) {
    // First, get the volume UUID for the target year
    this.store.select(selectPidFromAvailableYears(year.toString())).pipe(take(1)).subscribe(volumeUuid => {
      const uuid = volumeUuid as string;

      if (!uuid) {
        console.warn(`No volume UUID found for year ${year}, navigating anyway`);
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
        return;
      }

      // Dispatch action to load the year's children
      this.store.dispatch(loadPeriodicalItems({
        parentVolumeUuid: uuid
      }));

      // Wait for the data to load, then navigate
      this.store.select(selectPeriodicalChildren).pipe(
        filter(children => children && children.length > 0),
        take(1)
      ).subscribe(() => {
        console.log(`Year ${year} data loaded, navigating to ${pid}`);
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, pid]);
      });
    });
  }

  toggleMetadataSidebar(): void {
    this.uiStateService.toggleMetadataSidebar();
  }

  showMetadataSidebar(): void {
    this.uiStateService.setMetadataSidebarState(true);
  }

  hideMetadataSidebar(): void {
    this.uiStateService.setMetadataSidebarState(false);
  }

  /**
   * Check if a page index is currently active/selected
   * In book mode, both the current page and the next page are considered active
   * @param index - Page index to check
   * @returns true if the page is active
   */
  isPageActive(index: number): boolean {
    const currentIndex = this._currentPageIndex();

    if (this.iiifViewerService.isBookMode()) {
      // In book mode, both current and next page are active
      return index === currentIndex || index === currentIndex + 1;
    }

    // In single page mode, only the current page is active
    return index === currentIndex;
  }
}
