import {inject, Injectable, signal} from '@angular/core';
import {Page} from '../../../shared/models/page.model';
import {Store} from '@ngrx/store';
import {
  selectDocumentDetail,
  selectDocumentDetailError,
  selectDocumentDetailLoading,
  selectDocumentDetailOnlyRecordings,
  selectDocumentDetailPages,
} from '../../../shared/state/document-detail/document-detail.selectors';
import {loadDocumentDetail} from '../../../shared/state/document-detail/document-detail.actions';
import {Observable, take} from 'rxjs';
import {RecordInfoService} from '../../../shared/services/record-info.service';
import {Metadata} from '../../../shared/models/metadata.model';
import {SoundRecordGridControl,} from '../../../shared/components/toolbar-controls/toolbar-controls.component';
import {toSignal} from '@angular/core/rxjs-interop';
import {DocumentTypeEnum} from '../../constants/document-type';

@Injectable({
  providedIn: 'root'
})
export class DetailViewService {
  _currentPageIndex = signal<number>(0);
  _pages = signal<Page[]>([]);

  soundRecordingViewMode = signal<SoundRecordGridControl>('records');

  private store = inject(Store);
  private recordInfoService = inject(RecordInfoService);

  pages$ = this.store.select(selectDocumentDetailPages);
  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);

  private documentSignal = toSignal(this.document$, { initialValue: null });

  constructor() { }

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
    console.log('loadDocument');
    this.store.dispatch(loadDocumentDetail({}));

    // Wait until `document$` resolves and then call `checkForDataNeedToLoad`
    // this.document$.pipe(take(1)).subscribe((doc) => {
    //   console.log('document loaded', doc);
    //   if (doc && doc.uuid) {
    //     this.periodicalService.checkForDataNeedToLoad(doc.uuid);
    //   }
    // });

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

  getSoundRecordings(): Observable<Page[] | undefined> {
    // selectDocumentDetailOnlyRecordings
    return this.store.select(selectDocumentDetailOnlyRecordings);
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
    } else {
      this.goToPage(0);
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

  goToNextPeriodicalIssue() {
    //this.periodicalService.goToNextPeriodicalIssue();
  }

  goToPreviousPeriodicalIssue() {
    //this.periodicalService.goToPreviousPeriodicalIssue();
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
}
