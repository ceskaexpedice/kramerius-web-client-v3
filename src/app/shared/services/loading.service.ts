import { computed, inject, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, combineLatest, of, startWith } from 'rxjs';

import { selectSearchResultsLoading } from '../../modules/search-results-page/state/search.selectors';
import { selectPeriodicalLoading } from '../../modules/periodical/state/periodical-detail/periodical-detail.selectors';
import { selectDocumentDetailLoading } from '../state/document-detail/document-detail.selectors';
import {
  selectFolderDetailsLoading,
  selectFolderSearchResultsLoading,
  selectFoldersLoading,
} from '../../modules/saved-lists-page/state';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  readonly isLoadingSignal = signal(false);
  private store = inject(Store);

  constructor() {
    // combineLatest([
    //   this.safeSelect(selectSearchResultsLoading),
    //   this.safeSelect(selectGenresLoading),
    //   this.safeSelect(selectBooksLoading),
    //   this.safeSelect(selectDocumentTypesLoading),
    //   this.safeSelect(selectPeriodicalLoading),
    //   this.safeSelect(selectMusicLoading),
    //   this.safeSelect(selectDocumentDetailLoading),
    // ]).subscribe(([res, gen, book, docType, periodical, music, documentDetail]) => {
    //   this.isLoadingSignal.set(
    //     res || gen || book || docType || periodical || music || documentDetail
    //   );
    // });

    combineLatest([
      this.safeSelect(selectSearchResultsLoading),
      this.safeSelect(selectPeriodicalLoading),
      this.safeSelect(selectDocumentDetailLoading),
      this.safeSelect(selectFoldersLoading),
      this.safeSelect(selectFolderDetailsLoading),
      this.safeSelect(selectFolderSearchResultsLoading)
    ]).subscribe(([res, periodical, documentDetail, folders, folderDetails, folderSearchResults]) => {
      console.log('🌀 Loading flags:', {
        res, periodical, documentDetail, folders, folderDetails, folderSearchResults
      });

      this.isLoadingSignal.set(
        res || periodical || documentDetail || folders || folderDetails || folderSearchResults
      );
    });

  }

  get isLoading() {
    return computed(() => this.isLoadingSignal());
  }

  private safeSelect<T>(selector: any) {
    return this.store.select(selector).pipe(
      startWith(false),
      catchError(() => of(false))
    );
  }
}
