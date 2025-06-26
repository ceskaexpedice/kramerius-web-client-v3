import {inject, Injectable, signal} from '@angular/core';
import {Page} from '../../../shared/models/page.model';
import {Store} from '@ngrx/store';
import {
  selectDocumentDetail, selectDocumentDetailError, selectDocumentDetailLoading,
  selectDocumentDetailPages,
} from '../../../shared/state/document-detail/document-detail.selectors';
import {EnvironmentService} from '../../../shared/services/environment.service';
import {loadDocumentDetail} from '../../../shared/state/document-detail/document-detail.actions';
import {take} from 'rxjs';
import {DocumentDetail} from '../../models/document-detail';
import {RecordInfoService} from '../../../shared/services/record-info.service';

@Injectable({
  providedIn: 'root'
})
export class DetailViewService {
  _currentPageIndex = signal<number>(0);
  _pages = signal<Page[]>([]);

  private store = inject(Store);
  private recordInfoService = inject(RecordInfoService);

  pages$ = this.store.select(selectDocumentDetailPages);
  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);

  constructor() { }

  private _viewerMode = signal<'page' | 'audio' | 'article' | 'image'>('page');

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

  loadDocument() {
    this.store.dispatch(loadDocumentDetail());
  }

  loadPages() {
    this.store.select(selectDocumentDetailPages).subscribe(pages => {

      if (pages && pages.length > 0) {
        this._pages.set(pages);
        if (pages.length > 0) {
          this._currentPageIndex.set(0);
        }
      } else {
        this._pages.set([]);
        this._currentPageIndex.set(0);
      }

      this.checkAndSetCurrentPageFromUrl();

    });
  }

  checkAndSetCurrentPageFromUrl() {
    // check if there is a page in the URL
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');

    if (pageParam) {
      const pageIndex = this._pages().findIndex(page => page.pid === pageParam);
      if (pageIndex !== -1) {
        this._currentPageIndex.set(pageIndex);
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

      this.changePageUrl();
    }
  }

  changePageUrl() {
    const currentPage = this.getCurrentPage();
    // add to url ?page=PAGE_PID
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
    this.document$.pipe(take(1)).subscribe((doc: DocumentDetail | null) => {
      if (!doc) return;

      const uuid = doc?.pid;
      if (uuid) {
        this.recordInfoService.openRecordInfoDialog(uuid);
      }
    });
  }
}
