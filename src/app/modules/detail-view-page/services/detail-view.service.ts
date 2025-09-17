import {inject, Injectable, signal} from '@angular/core';
import {Page} from '../../../shared/models/page.model';
import {Store} from '@ngrx/store';
import {ActivatedRoute, Router} from '@angular/router';
import {APP_ROUTES_ENUM} from '../../../app.routes';
import {
  selectDocumentDetail,
  selectDocumentDetailError,
  selectDocumentDetailLoading,
  selectDocumentDetailOnlyRecordings,
  selectDocumentDetailPages,
} from '../../../shared/state/document-detail/document-detail.selectors';
import {loadDocumentDetail} from '../../../shared/state/document-detail/document-detail.actions';
import {Observable, skip, take, filter} from 'rxjs';
import {selectPeriodicalChildren, selectPidFromAvailableYears} from '../../periodical/state/periodical-detail/periodical-detail.selectors';
import {RecordInfoService} from '../../../shared/services/record-info.service';
import {Metadata} from '../../../shared/models/metadata.model';
import {SoundRecordGridControl} from '../../../shared/components/toolbar-controls/toolbar-controls.component';
import {toSignal} from '@angular/core/rxjs-interop';
import {DocumentTypeEnum} from '../../constants/document-type';
import {loadPeriodical, loadPeriodicalItems} from '../../periodical/state/periodical-detail/periodical-detail.actions';
import {SolrSortDirections, SolrSortFields} from '../../../core/solr/solr-helpers';
import {LocalStorageService} from '../../../shared/services/local-storage.service';

@Injectable({
  providedIn: 'root'
})
export class DetailViewService {
  _currentPageIndex = signal<number>(0);
  _pages = signal<Page[]>([]);

  soundRecordingViewMode = signal<SoundRecordGridControl>('records');

  private store = inject(Store);
  private recordInfoService = inject(RecordInfoService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  pages$ = this.store.select(selectDocumentDetailPages);
  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);
  periodicalChildren$ = this.store.select(selectPeriodicalChildren);

  private documentSignal = toSignal(this.document$, { initialValue: null });

  constructor() {
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
    console.log('Loading periodical children for:', doc);

    if (doc?.rootModel === DocumentTypeEnum.periodical || doc?.model === DocumentTypeEnum.periodicalitem) {

      // Fallback: If document is directly a periodicalitem, try to get parent info
      if (doc?.model === DocumentTypeEnum.periodicalitem && doc?.ownParentPid) {
        console.log('Direct periodicalitem - dispatching loadPeriodicalItems for parentPid:', doc.ownParentPid);

        this.store.dispatch(loadPeriodicalItems({
          parentVolumeUuid: doc.ownParentPid
        }));

        return;
      }

      // Default fallback: Load entire periodical structure
      const rootPid = doc?.rootPid || doc?.uuid;
      if (rootPid) {
        console.log('Fallback - dispatching loadPeriodical for rootPid:', rootPid);

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
    console.log('loadPages called');
    this.store.select(selectDocumentDetailPages)
      .pipe(take(1))
      .subscribe(pages => {
        console.log('selectDocumentDetailPages', pages);
        const safePages = pages ?? [];
        this._pages.set(safePages);
        this._currentPageIndex.set(0);

        if (this.document?.model !== DocumentTypeEnum.soundrecording) {
          this.checkAndSetCurrentPageFromUrl();
        }
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
    console.log('goToPage', index);
    console.log('_pages', this._pages());
    if (index >= 0 && index < this._pages().length) {
      console.log('ide sem')
      console.log('index', index);
      this._currentPageIndex.set(index);
      console.log('currentPageIndex set to', this._currentPageIndex());

      console.log('document', this.document);
      if (this.document?.model === DocumentTypeEnum.soundrecording && this.soundRecordingViewMode() === 'records') {
        this.soundRecordingViewMode.set('images');
      }

      console.log('index set to', index);
      this.changePageUrl();
    }
  }

  changePageUrl() {
    console.log('changePageUrl');
    const currentPage = this.getCurrentPage();
    // add to url ?page=PAGE_PID

    console.log('changePageUrl', currentPage);
    if (currentPage) {
      const url = new URL(window.location.href);
      url.searchParams.set('page', currentPage.pid);
      window.history.replaceState({}, '', url.toString());
    }
  }

  goToNext(pagesToGoForward: number = 1) {
    this.goToPage(this._currentPageIndex() + pagesToGoForward);
  }

  goToPrevious(pagesToGoBack: number = 1) {
    this.goToPage(this._currentPageIndex() - pagesToGoBack);
  }

  goToNextPeriodicalIssue() {
    const currentDoc = this.document;
    if (!currentDoc?.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      console.log('goToNextPeriodicalIssue', children);
      const currentIndex = children.findIndex(child => child.pid === currentDoc.uuid);
      if (currentIndex !== -1 && currentIndex < children.length - 1) {
        const nextIssue = children[currentIndex + 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, nextIssue.pid]);
      }
    });
  }

  goToPreviousPeriodicalIssue() {
    const currentDoc = this.document;
    if (!currentDoc?.uuid) return;

    this.periodicalChildren$.pipe(take(1)).subscribe(children => {
      const currentIndex = children.findIndex(child => child.pid === currentDoc.uuid);
      if (currentIndex > 0) {
        const previousIssue = children[currentIndex - 1];
        this.router.navigate([APP_ROUTES_ENUM.DETAIL_VIEW, previousIssue.pid]);
      }
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

      console.log(`Loading periodical items for year ${year} with volume UUID: ${uuid}`);

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
}
