import { inject, Injectable } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import {
  selectLastPageSearchPayload,
  selectPageSearchResults,
  selectPageSearchResultsLoading,
  selectPageSearchResultsTotalCount,
} from '../../modules/search-results-page/state/search.selectors';
import { loadPageSearchResults } from '../../modules/search-results-page/state/search.actions';
import { SearchDocument } from '../../modules/models/search-document';

/**
 * Read-only facade for the "Pages" section of unified search results.
 *
 * Pages spill into the same paginator as titles/articles/attachments —
 * there is no separate paginator. The pages-only Solr request is fired
 * automatically by `triggerPageSearchAfterMain$` once the main search
 * returns, sized to fill the remainder of the current main-paginator
 * window. This service exists so views can subscribe to pages state and
 * so the group toggle can re-fire the pages request without touching
 * the main search.
 */
@Injectable({ providedIn: 'root' })
export class PageSearchService {
  private store = inject(Store);

  readonly pageResults$: Observable<SearchDocument[]> = this.store.select(selectPageSearchResults);
  readonly pageResultsLoading$: Observable<boolean> = this.store.select(selectPageSearchResultsLoading);
  readonly pagesTotalCount$: Observable<number> = this.store.select(selectPageSearchResultsTotalCount);

  /**
   * Re-fire the last pages request with a flipped `grouped` flag.
   * Keeps the same start/rows so the current main-paginator window stays
   * aligned — only the grouping representation of the page docs changes.
   */
  async reloadWithGrouped(grouped: boolean): Promise<void> {
    const payload = await firstValueFrom(this.store.select(selectLastPageSearchPayload).pipe(take(1)));
    if (!payload) return;
    this.store.dispatch(loadPageSearchResults({ ...payload, grouped }));
  }
}
