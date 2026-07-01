import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { CustomSearchService } from '../../../../shared/services/custom-search.service';
import {
  ToggleButtonGroupComponent,
  ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import { customDefinedFacetsEnum } from '../../../search-results-page/const/facets';
import { SavedListsFilterService } from '../../services/saved-lists-filter.service';

type WhereToSearchValue = 'all' | 'titles' | 'article' | 'supplement' | 'page' | null;

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
 * same param the folder search builder already applies. Unlike the search page
 * there is no grouped-pages mode, so the page/pageGrouped split is omitted.
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
  private customSearchService = inject(CustomSearchService);
  private route = inject(ActivatedRoute);

  private whereToSearchItems = toSignal(
    this.filterService.getFacets().pipe(
      map((facets: Record<string, FacetItem[]> | null | undefined): FacetItem[] =>
        (facets?.[FACET_KEY] ?? []) as FacetItem[],
      ),
    ),
    { initialValue: [] as FacetItem[] },
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

  value = computed<WhereToSearchValue>(() => {
    const selected = this.selectedWhereToSearch();
    return (selected ?? 'all') as WhereToSearchValue;
  });

  options = computed<ToggleOption<WhereToSearchValue>[]>(() => {
    const items = this.whereToSearchItems();
    const byName = new Map(items.map(i => [i.name, i.count]));
    const has = (name: string) => (byName.get(name) ?? 0) > 0;

    const result: ToggleOption<WhereToSearchValue>[] = [
      { value: 'all', label: 'tab-all' },
    ];

    if (has('titles')) {
      result.push({ value: 'titles', label: 'titles-section-header' });
    }
    if (has('page')) {
      result.push({ value: 'page', label: 'pages-section-header' });
    }
    if (has('article')) {
      result.push({ value: 'article', label: 'articles-section-header' });
    }
    if (has('supplement')) {
      result.push({ value: 'supplement', label: 'attachments-section-header' });
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
        this.customSearchService.removeAllFiltersByFacetKey(FACET_KEY);
      }
      return;
    }

    if (this.selectedWhereToSearch() !== next) {
      this.customSearchService.setSingleFilterForFacet(FACET_KEY, next);
    }
  }
}
