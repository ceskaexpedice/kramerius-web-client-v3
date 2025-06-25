import {inject, Injectable, signal} from '@angular/core';
import {Page} from '../../../shared/models/page.model';
import {Store} from '@ngrx/store';
import {selectDocumentDetailPages} from '../../../shared/state/document-detail/document-detail.selectors';

@Injectable({
  providedIn: 'root'
})
export class DetailViewService {
  _currentPageIndex = signal<number>(0);
  _pages = signal<Page[]>([]);

  private store = inject(Store);

  pages$ = this.store.select(selectDocumentDetailPages);

  constructor() { }

  private _viewerMode = signal<'page' | 'audio' | 'article' | 'image'>('page');

  get pages() {
    return this._pages();
  }

  get currentPageIndex() {
    return this._currentPageIndex();
  }

  get viewerMode() {
    return this._viewerMode();
  }

  get currentPagePid(): string | null {
    const currentPage = this.getCurrentPage();
    return currentPage ? currentPage.pid : null;
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

    });
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
    }
  }

  goToNext() {
    this.goToPage(this._currentPageIndex() + 1);
  }

  goToPrevious() {
    this.goToPage(this._currentPageIndex() - 1);
  }

  getCurrentPage(): Page | null {
    const pages = this._pages();
    return pages[this._currentPageIndex()] ?? null;
  }
}
