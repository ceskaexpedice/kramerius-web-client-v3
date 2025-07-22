import { computed, inject, Injectable, signal } from '@angular/core';
import { Store } from '@ngrx/store';
import { catchError, combineLatest, of, startWith } from 'rxjs';

import { selectSearchResultsLoading } from '../../modules/search-results-page/state/search.selectors';
import { selectGenresLoading } from '../../modules/search/state/genres/genres.selectors';
import { selectBooksLoading } from '../../modules/search/state/books/books.selectors';
import { selectDocumentTypesLoading } from '../../modules/search/state/document-types/document-types.selectors';
import { selectPeriodicalLoading } from '../../modules/periodical/state/periodical-detail.selectors';
import { selectMusicLoading } from '../../modules/music/state/music-detail.selectors';
import { selectDocumentDetailLoading } from '../state/document-detail/document-detail.selectors';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  readonly isLoadingSignal = signal(false);
  private store = inject(Store);

  constructor() {
    combineLatest([
      this.safeSelect(selectSearchResultsLoading),
      this.safeSelect(selectGenresLoading),
      this.safeSelect(selectBooksLoading),
      this.safeSelect(selectDocumentTypesLoading),
      this.safeSelect(selectPeriodicalLoading),
      this.safeSelect(selectMusicLoading),
      this.safeSelect(selectDocumentDetailLoading),
    ]).subscribe(([res, gen, book, docType, periodical, music, documentDetail]) => {
      this.isLoadingSignal.set(
        res || gen || book || docType || periodical || music || documentDetail
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
