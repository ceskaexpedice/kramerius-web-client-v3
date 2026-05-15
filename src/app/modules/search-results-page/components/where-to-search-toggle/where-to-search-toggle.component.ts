import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { SearchService } from '../../../../shared/services/search.service';
import { CustomSearchService } from '../../../../shared/services/custom-search.service';
import {
  ToggleButtonGroupComponent,
  ToggleOption,
} from '../../../../shared/components/toggle-button-group/toggle-button-group.component';
import { customDefinedFacetsEnum } from '../../const/facets';

type WhereToSearchValue = 'all' | 'titles' | 'pageGrouped' | 'article' | 'supplement' | 'page' | null;

interface FacetItem {
  name: string;
  count: number;
}

const FACET_KEY = customDefinedFacetsEnum.whereToSearchModel;

@Component({
  selector: 'app-where-to-search-toggle',
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
      display: contents;
    }
  `],
})
export class WhereToSearchToggleComponent {
  private searchService = inject(SearchService);
  private customSearchService = inject(CustomSearchService);
  private route = inject(ActivatedRoute);

  private whereToSearchItems = toSignal(
    this.searchService.getFacets().pipe(
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

  private appliedFilters = this.customSearchService.filters;

  private selectedWhereToSearch = computed<string | null>(() => {
    const entry = this.appliedFilters().find(k => k.startsWith(FACET_KEY + ':'));
    return entry ? entry.split(':')[1] : null;
  });

  private isGrouped = computed<boolean>(() => {
    // Track the URL group param reactively; fall back to SearchService default.
    this.groupParam();
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

    const result: ToggleOption<WhereToSearchValue>[] = [
      { value: 'all', label: 'tab-all' },
    ];

    if (has('titles')) {
      result.push({ value: 'titles', label: 'titles-section-header' });
    }
    if (has('page')) {
      result.push({ value: 'pageGrouped', label: 'group-results--titles' });
      result.push({ value: 'page', label: 'group-results--pages' });
    }
    if (has('article')) {
      result.push({ value: 'article', label: 'articles-section-header' });
    }
    if (has('supplement')) {
      result.push({ value: 'supplement', label: 'attachments-section-header' });
    }


    // Hide the toggle when there's no meaningful choice:
    // - only "all" (no real categories), or
    // - "all" + a single category (e.g. only titles match), since clicking
    //   either yields the same result set.
    return result.length > 2 ? result : [];
  });

  onChange(next: WhereToSearchValue): void {
    if (next === null) return;

    if (next === 'all') {
      if (this.selectedWhereToSearch()) {
        this.customSearchService.removeAllFiltersByFacetKey(FACET_KEY);
      }
      return;
    }

    const targetWhereToSearch = next === 'pageGrouped' || next === 'page' ? 'page' : next;
    const currentWhereToSearch = this.selectedWhereToSearch();
    const isPage = next === 'page' || next === 'pageGrouped';
    const desiredGrouped = next === 'pageGrouped';

    // For page/pageGrouped, set the `group` URL param in the same navigation
    // as the customSearch update so there's only one search reload.
    const extraParams = isPage
      ? { group: desiredGrouped ? 'true' : 'false' }
      : {};

    if (currentWhereToSearch !== targetWhereToSearch) {
      this.customSearchService.setSingleFilterForFacet(FACET_KEY, targetWhereToSearch, extraParams);
    } else if (isPage && this.isGrouped() !== desiredGrouped) {
      // whereToSearch already on `page` — just flip grouped via SearchService
      // so its internal override + settings stay in sync.
      this.searchService.setGroupResults(desiredGrouped);
    }
  }
}
