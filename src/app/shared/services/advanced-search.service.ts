import { computed, inject, Injectable, signal } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { AdvancedSearchDialogComponent } from '../dialogs/advanced-search-dialog/advanced-search-dialog.component';
import { ADVANCED_FILTERS, AdvancedFilterDefinition } from '../dialogs/advanced-search-dialog/advanced-filters';
import { SolrOperators } from '../../core/solr/solr-helpers';
import { QueryParamsService } from '../../core/services/QueryParamsManager';
import { ActivatedRoute, Params, Router } from '@angular/router';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {take} from 'rxjs';

export interface FilterGroup {
  filters: AdvancedFilterDefinition[];
  operator: SolrOperators;
}

@Injectable({
  providedIn: 'root'
})
export class AdvancedSearchService {
  private pendingFiltersSignal = signal<string[]>([]);
  private pendingOperatorsSignal = signal<Record<string, SolrOperators>>({});
  private mainOperatorSignal = signal<SolrOperators>(SolrOperators.and);
  private filterGroupsSignal = signal<FilterGroup[]>([]);

  private appliedGroupsSignal = signal<FilterGroup[]>([]);
  private appliedMainOperatorSignal = signal<SolrOperators>(SolrOperators.and);

  filters = computed(() => this.pendingFiltersSignal());
  operators = computed(() => this.pendingOperatorsSignal());
  pendingGroups = computed(() => this.filterGroupsSignal());
  mainOperator = computed(() => this.mainOperatorSignal());

  private dialog = inject(MatDialog);
  private queryParamsService = inject(QueryParamsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  initializeFromRoute(): void {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      this.resetFromParams(params);

      // aj basic filters
      const baseFilters = this.queryParamsService.getFilters(params);
      const baseOperators = this.queryParamsService.getOperators(params);

      this.setPendingFilters(baseFilters);
      this.setPendingOperators(baseOperators);

      if (this.filterGroupsSignal().length === 0) {
        this.addGroup();
      }
    });
  }

  setPendingFilters(filters: string[]) {
    this.pendingFiltersSignal.set(filters);
  }

  setPendingOperators(ops: Record<string, SolrOperators>) {
    this.pendingOperatorsSignal.set(ops);
  }

  toggleMainOperator() {
    this.mainOperatorSignal.set(
      this.mainOperatorSignal() === SolrOperators.and ? SolrOperators.or : SolrOperators.and
    );
  }

  clear() {
    this.pendingFiltersSignal.set([]);
    this.pendingOperatorsSignal.set({});
    this.filterGroupsSignal.set([]);
    this.appliedGroupsSignal.set([]);
    this.queryParamsService.removeAdvancedSearch(this.route);
  }

  onSubmitAdvancedSearch() {
    const advancedQuery = this.getAdvancedQueryString();
    const mainOperator = this.mainOperator();

    const isOnSearchPage = this.router.url.split('?')[0] === `/${APP_ROUTES_ENUM.SEARCH_RESULTS}`;

    if (!isOnSearchPage) {
      this.router.navigate([APP_ROUTES_ENUM.SEARCH_RESULTS], {
        queryParams: {
          advSearch: advancedQuery || null,
          advOp: mainOperator
        }
      });
    } else {
      this.queryParamsService.appendToQueryParams(this.route, {
        advSearch: advancedQuery || null,
        advOp: mainOperator
      });
    }
  }

  setAppliedGroups(groups: FilterGroup[]) {
    this.appliedGroupsSignal.set(groups);
  }

  setAppliedMainOperator(op: SolrOperators) {
    this.appliedMainOperatorSignal.set(op);
  }

  getFilters() {
    return this.pendingFiltersSignal();
  }

  getOperators() {
    return this.pendingOperatorsSignal();
  }

  getAdvancedQueryString(): string | undefined {
    const groups = this.filterGroupsSignal();
    const mainOperator = this.mainOperatorSignal();

    const advancedQueryParts: string[] = groups.map(group => {
      const parts = group.filters
        .filter(filter => !!filter.value?.trim())
        .map(filter => {
          const value = filter.value.trim();
          const isRange = value.startsWith('[') && value.endsWith(']') && value.includes(' TO ');
          return isRange
            ? `${filter.solrField}:${value}`
            : `${filter.solrField}:"${value}"`;
        });

      return parts.length > 1
        ? `(${parts.join(` ${group.operator} `)})`
        : parts[0];
    }).filter(Boolean);

    if (advancedQueryParts.length === 0) return undefined;

    return advancedQueryParts.length > 1
      ? `(${advancedQueryParts.join(` ${mainOperator} `)})`
      : advancedQueryParts[0];
  }

  getAdvancedParams(params: Params): { advancedQuery?: string, advancedQueryMainOperator: SolrOperators } {
    const advancedQuery = this.queryParamsService.getAdvancedSearch(params);
    const mainOperator = (this.queryParamsService.getAdvancedMainOperator(params) || SolrOperators.and) as SolrOperators;

    return {
      advancedQuery: advancedQuery || undefined,
      advancedQueryMainOperator: mainOperator
    };
  }

  openDialog(): void {
    const dialogRef = this.dialog.open(AdvancedSearchDialogComponent, {
      width: '80vw',
      height: '80vh'
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        this.setAppliedGroups(this.filterGroupsSignal());
        this.setAppliedMainOperator(this.mainOperatorSignal());
      }
    });
  }

  addGroup(): void {
    const current = this.filterGroupsSignal();
    this.filterGroupsSignal.set([...current, { filters: [], operator: SolrOperators.and }]);
  }

  removeGroup(index: number): void {
    const current = [...this.filterGroupsSignal()];
    current.splice(index, 1);

    this.filterGroupsSignal.set(current);

    if (current.length === 0) {
      this.addGroup();
    }
  }

  updateGroupFilters(index: number, filters: AdvancedFilterDefinition[]): void {
    const current = [...this.filterGroupsSignal()];
    if (current[index]) {
      current[index] = { ...current[index], filters };
      this.filterGroupsSignal.set(current);
    }
  }

  updateGroupOperator(index: number, operator: SolrOperators): void {
    const current = [...this.filterGroupsSignal()];
    if (current[index]) {
      current[index] = { ...current[index], operator };
      this.filterGroupsSignal.set(current);
    }
  }

  isAdvancedSearchActive(): boolean {
    return this.appliedGroupsSignal().some(group =>
      group.filters.some(f => f.value?.trim())
    );
  }

  getAdvancedSearchPreviewGroups = computed(() => {
    const mainOp = this.appliedMainOperatorSignal();

    return this.appliedGroupsSignal().map(group => {
      const filters = group.filters
        .filter(f => !!f.value?.trim())
        .map(f => ({
          label: f.label,
          value: f.value
        }));

      return {
        operator: group.operator,
        filters
      };
    }).filter(group => group.filters.length > 0);
  });

  resetFromParams(params: Params): void {
    const rawQuery = params['advSearch'];
    const mainOperator = (params['advOp'] as SolrOperators) || SolrOperators.and;

    if (!rawQuery) return;

    const groups: FilterGroup[] = [];
    const groupParts = rawQuery.match(/\(.*?\)|[^()]+/g)?.filter(Boolean) || [];

    for (const groupRaw of groupParts) {
      const cleaned = groupRaw.replace(/^\(|\)$/g, '');
      const parts = cleaned.split(/\s+(AND|OR)\s+/i);
      const filters: AdvancedFilterDefinition[] = [];

      for (let i = 0; i < parts.length; i += 2) {
        const [solrField, rawValue] = parts[i].split(':');
        const value = rawValue?.replace(/^"|"$/g, '');

        if (!solrField || !value) continue;

        const base = ADVANCED_FILTERS.find(f => f.solrField === solrField || f.key === solrField);

        if (base) {
          filters.push({ ...base, value: value.trim() });
        } else {
          filters.push({
            key: solrField as any,
            label: solrField,
            inputType: 'text' as any,
            solrField,
            value: value.trim()
          });
        }
      }

      if (filters.length > 0) {
        const operator = parts.length > 2 ? (parts[1].toUpperCase() as SolrOperators) : SolrOperators.and;
        groups.push({ filters, operator });
      }
    }

    this.mainOperatorSignal.set(mainOperator);
    this.filterGroupsSignal.set(groups);
    this.appliedMainOperatorSignal.set(mainOperator);
    this.appliedGroupsSignal.set(groups);
  }
}
