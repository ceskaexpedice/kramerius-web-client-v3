import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { SearchService } from '../../../../shared/services/search.service';
import { CustomSearchService } from '../../../../shared/services/custom-search.service';
import {
  ToggleButtonGroupComponent,
  ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import { customDefinedFacetsEnum } from '../../../search-results-page/const/facets';
import { SavedListsFilterService } from '../../services/saved-lists-filter.service';

type WhereToSearchValue = 'all' | 'titles' | 'pageGrouped' | 'article' | 'supplement' | 'page' | null;

interface FacetItem {
  name: string;
  count: number;
}

const FACET_KEY = customDefinedFacetsEnum.whereToSearchModel;

/**
 * "Where to search" scope toggle for the saved-lists (folder) page.
 *
 * Mirrors the search-results WhereToSearchToggleComponent but is scoped to a
 * folder: facet counts come from the folder Solr search (SavedListsFilterService)
 * and the selection is written to ?customSearch via CustomSearchService — the
 * same param the folder search builder already applies. Like the search page,
 * pages offer a grouped ("Strany v tituloch") and an ungrouped mode via ?group.
 */
@Component({
  selector: 'app-saved-lists-where-to-search-toggle',
  standalone: true,
  imports: [ToggleButtonGroupComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (options().length > 0) {
      <app-toggle-button-group
        [options]="options()"
        [value]="value()"
        size="md"
        variant="pill"
        (valueChange)="onChange($event)" />
    }
  `,
  styles: [`
    :host {
      display: inline-flex;
      flex: 0 0 auto;
    }
  `],
})
export class SavedListsWhereToSearchToggleComponent {
  private filterService = inject(SavedListsFilterService);
  private searchService = inject(SearchService);
  private customSearchService = inject(CustomSearchService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private whereToSearchItems = toSignal(
    this.filterService.getFacets().pipe(
      map((facets: Record<string, FacetItem[]> | null | undefined): FacetItem[] =>
        (facets?.[FACET_KEY] ?? []) as FacetItem[],
      ),
    ),
    { initialValue: [] as FacetItem[] },
  );

  private groupParam = toSignal(
    this.route.queryParams.pipe(map(p => p['group'] as string | undefined)),
    { initialValue: undefined as string | undefined },
  );

  // Free-text term (?query=): the page scopes only exist while a fulltext
  // search is active — the folder search fires its pages request under the
  // same condition (FoldersEffects.shouldIncludePages).
  private searchQuery = toSignal(
    this.route.queryParams.pipe(map(p => ((p['query'] as string | undefined) ?? '').trim())),
    { initialValue: '' },
  );

  // Read the active selection straight from the URL (?customSearch=) so the
  // toggle reflects the real state on load and back/forward, independent of
  // whether the facet panel (which seeds CustomSearchService) has been opened.
  private selectedWhereToSearch = toSignal(
    this.route.queryParams.pipe(
      map(params => {
        const raw = params['customSearch'] as string | undefined;
        const entry = raw?.split(',').find(k => k.startsWith(FACET_KEY + ':'));
        return entry ? entry.split(':')[1] : null;
      }),
    ),
    { initialValue: null as string | null },
  );

  private isGrouped = computed<boolean>(() => {
    // Read ?group straight from the URL — the folder search builder does the
    // same (`params['group'] === 'true'`), so the toggle always reflects what
    // the folder search actually ran with. Don't consult SearchService here:
    // its in-memory override belongs to the main search page and can be stale.
    const param = this.groupParam();
    if (param === 'true') return true;
    if (param === 'false') return false;
    return this.searchService.isGrouped();
  });

  value = computed<WhereToSearchValue>(() => {
    const selected = this.selectedWhereToSearch();
    if (!selected) return 'all';
    if (selected === 'page') {
      return this.isGrouped() ? 'pageGrouped' : 'page';
    }
    return selected as WhereToSearchValue;
  });

  options = computed<ToggleOption<WhereToSearchValue>[]>(() => {
    const items = this.whereToSearchItems();
    const byName = new Map(items.map(i => [i.name, i.count]));
    const has = (name: string) => (byName.get(name) ?? 0) > 0;
    const selected = this.selectedWhereToSearch();

    const result: ToggleOption<WhereToSearchValue>[] = [
      { value: 'all', label: 'tab-all' },
    ];

    if (has('titles')) {
      result.push({ value: 'titles', label: 'titles-section-header' });
    }
    // Page scopes only make sense while a fulltext term is active (that's when
    // the folder search actually queries pages) — a saved page item alone must
    // not surface them. Keep them while the page scope is selected, though, so
    // clearing the term doesn't strand the toggle on a value it can't render.
    if (has('page') && (this.searchQuery().length > 0 || selected === 'page')) {
      result.push({ value: 'pageGrouped', label: 'group-results--titles' });
      result.push({ value: 'page', label: 'group-results--pages' });
    }
    if (has('article')) {
      result.push({ value: 'article', label: 'articles-section-header' });
    }
    if (has('supplement')) {
      result.push({ value: 'supplement', label: 'attachments-section-header' });
    }

    // With a scope selected the toggle must stay visible whatever the counts
    // say — it's the only way back to "all".
    if (selected) {
      return result;
    }

    // Hide the toggle when there's no meaningful choice:
    // - only "all" (no real categories), or
    // - "all" + a single category, since clicking either yields the same set.
    return result.length > 2 ? result : [];
  });

  onChange(next: WhereToSearchValue): void {
    if (next === null) return;

    // Sync the service's filter list from the URL first so we merge against the
    // current state (accessibility/range filters) rather than a stale snapshot.
    this.customSearchService.initializeFromRoute();

    if (next === 'all') {
      if (this.selectedWhereToSearch()) {
        // Leaving page mode: drop the ?group param too — grouping only applies
        // to the pages scope, and a lingering group=true would group the lazy
        // pages section on "all".
        this.customSearchService.removeAllFiltersByFacetKey(FACET_KEY, { group: null });
      }
      return;
    }

    const targetWhereToSearch = next === 'pageGrouped' || next === 'page' ? 'page' : next;
    const currentWhereToSearch = this.selectedWhereToSearch();
    const isPage = next === 'page' || next === 'pageGrouped';
    const desiredGrouped = next === 'pageGrouped';

    // For page/pageGrouped, set the `group` URL param in the same navigation
    // as the customSearch update so there's only one search reload. For any
    // other scope, remove it — grouping is a pages-only concept here.
    const extraParams = isPage
      ? { group: desiredGrouped ? 'true' : 'false' }
      : { group: null };

    if (currentWhereToSearch !== targetWhereToSearch) {
      this.customSearchService.setSingleFilterForFacet(FACET_KEY, targetWhereToSearch, extraParams);
    } else if (isPage && this.isGrouped() !== desiredGrouped) {
      // whereToSearch already on `page` — flip ?group via a real router
      // navigation so the saved-lists queryParams subscription refires the
      // folder search. (SearchService.setGroupResults would silently
      // replaceState and reload the MAIN search page's pages request, which
      // does nothing here.)
      this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { group: desiredGrouped ? 'true' : 'false', page: 1 },
        queryParamsHandling: 'merge',
      });
    }
  }
}
