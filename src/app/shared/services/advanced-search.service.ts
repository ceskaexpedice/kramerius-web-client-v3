import {computed, inject, Injectable, signal} from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import {AdvancedSearchDialogComponent} from '../dialogs/advanced-search-dialog/advanced-search-dialog.component';
import {
  ADVANCED_FILTERS,
  AdvancedFilterDefinition,
  FilterElementType,
  isFulltextFilter,
  SolrFacetKey,
} from '../dialogs/advanced-search-dialog/solr-filters';
import {SolrOperators} from '../../core/solr/solr-helpers';
import {QueryParamsService} from '../../core/services/QueryParamsManager';
import {ActivatedRoute, Params, Router} from '@angular/router';
import {APP_ROUTES_ENUM} from '../../app.routes';
import {take} from 'rxjs';
import {mapAdvancedSearchField} from '../../modules/search-results-page/const/facets';

export interface FilterGroup {
  filters: AdvancedFilterDefinition[];
  operator: SolrOperators;
}

@Injectable({
  providedIn: 'root',
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
      this.mainOperatorSignal() === SolrOperators.and ? SolrOperators.or : SolrOperators.and,
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

    const updatedFq = this.getFilters();
    const updatedOperators = this.getOperators();

    console.log('advancedQuery:', advancedQuery);

    const queryParams: any = {
      advSearch: advancedQuery || null,
      advOp: mainOperator,
      fq: updatedFq.length > 0 ? updatedFq : null,
      ...Object.fromEntries(
        Object.entries(updatedOperators).map(([key, op]) => [`${key}_operator`, op]),
      ),
    };

    if (!isOnSearchPage) {
      this.router.navigate([APP_ROUTES_ENUM.SEARCH_RESULTS], {
        queryParams,
      });
    } else {
      this.queryParamsService.appendToQueryParams(this.route, queryParams);
    }
  }

  setAppliedGroups(groups: FilterGroup[]) {
    console.log('applied groups set:', groups);
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
        .filter(filter => !!filter.elementValue?.trim())
        .map(filter => {
          const value = filter.elementValue.trim();
          const isRange = value.startsWith('[') && value.endsWith(']') && value.includes(' TO ');
          let useRaw = filter.userRawQueryFormat || false;
          const isEquals = filter.isEquals !== false; // default true if undefined


          if (value.startsWith('*') || value.endsWith('*')) {
            useRaw = true;
          }

          const fieldPrefix = isEquals ? '' : '-';

          return isRange
            ? `${fieldPrefix}${filter.solrField}:${value}`
            : useRaw
              ? `${fieldPrefix}${filter.solrField}:(${value})`
              : `${fieldPrefix}${filter.solrField}:"${value}"`;
        });

      return parts.length > 0
        ? `(${parts.join(` ${group.operator} `)})`
        : '';
    }).filter(Boolean);

    if (advancedQueryParts.length === 0) return undefined;

    return advancedQueryParts.length > 1
      ? `(${advancedQueryParts.join(` ${mainOperator} `)})`
      : advancedQueryParts[0];
  }

  getSolrAdvancedQueryString(): string | undefined {
    const groups = this.filterGroupsSignal();
    const mainOperator = this.mainOperatorSignal();

    const advancedQueryParts: string[] = groups.map(group => {
      const parts = group.filters
        .filter(filter => !!filter.solrValue?.trim())
        .flatMap(filter => {
          console.log('Processing filter:', filter);

          let isRange = false;
          let useRaw = filter.userRawQueryFormat || false;
          const isEquals = filter.isEquals !== false; // default = true
          const value = filter.solrValue.trim();

          // Negation prefix
          const fieldPrefix = isEquals ? '' : '-';

          // Handle Date filter (with optional offset)
          if (filter.key === SolrFacetKey.Date) {
            if (value.startsWith('[') && value.endsWith(']')) {
              isRange = true;
              return `${filter.solrField}:${value}`;
            }

            // Check if it's a day-month range format (DD.MM-DD.MM)
            const dayMonthRangePattern = /^\d{2}\.\d{2}-\d{2}\.\d{2}$/;
            if (dayMonthRangePattern.test(filter.elementValue)) {
              // Parse DD.MM-DD.MM format and build date range query
              const [fromPart, toPart] = filter.elementValue.split('-');
              const [startDay, startMonth] = fromPart.split('.').map(Number);
              const [endDay, endMonth] = toPart.split('.').map(Number);

              const dateRangeQuery = this.buildDateRangeFilter(startDay, startMonth, endDay, endMonth);
              return `${fieldPrefix}${dateRangeQuery}`;
            }

            // Handle regular date format (YYYY-MM-DD+offset)
            const dateParts = filter.elementValue.split('+');
            const dateStr = dateParts[0];
            const offset = dateParts[1] ? parseInt(dateParts[1], 10) : 0;

            const [year, month, day] = dateStr.split('-').map(Number);
            const date = new Date(Date.UTC(year, month - 1, day));

            const startDate = new Date(date);
            const endDate = new Date(date);
            // end date should have time 23:59:59
            endDate.setUTCDate(endDate.getUTCDate() + offset);
            endDate.setUTCHours(23, 59, 59, 999);

            filter.solrValue = `[${startDate.toISOString()} TO ${endDate.toISOString()}]`;
            isRange = true;

            return `${fieldPrefix}${filter.solrField}:${filter.solrValue}`;
          }

          // Handle Year filter (special case, no negation expected)
          if (filter.key === SolrFacetKey.Year) {
            return `${isEquals ? '' : 'NOT '}(date_range_start.year:${value} OR date_range_end.year:${value})`;
          }

          if (value.startsWith('*') || value.endsWith('*')) {
            useRaw = true;
          }

          // Map the solr field to search fields if applicable
          const mappedFields = mapAdvancedSearchField(filter.solrField || '');

          // Generate query parts for each mapped field
          return mappedFields.map((mappedField: any) => {
            return isRange
              ? `${fieldPrefix}${mappedField}:${value}`
              : useRaw
                ? `${fieldPrefix}${mappedField}:(${value})`
                : `${fieldPrefix}${mappedField}:"${value}"`;
          });
        });

      return parts.length > 0
        ? `${parts.join(` ${group.operator} `)}`
        : '';
    }).filter(Boolean);

    if (advancedQueryParts.length === 0) return undefined;

    return advancedQueryParts.length > 1
      ? `(${advancedQueryParts.join(` ${mainOperator} `)})`
      : advancedQueryParts[0];
  }

  getAdvancedParams(params: Params): { advancedQuery?: string, advancedQueryMainOperator?: SolrOperators } {
    const advancedQueryFromUrl = params['advSearch'];
    const advancedQueryMainOperator = (params['advOp'] as SolrOperators) || SolrOperators.and;

    if (!advancedQueryFromUrl) {
      return {advancedQueryMainOperator};
    }

    // If we have reset from params, use the solr-specific query
    if (this.filterGroupsSignal().length > 0) {
      return {
        advancedQuery: this.getSolrAdvancedQueryString(),
        advancedQueryMainOperator,
      };
    }

    // Fallback if the filter groups haven't been properly initialized
    return {
      advancedQuery: advancedQueryFromUrl,
      advancedQueryMainOperator,
    };
  }

  openDialog(): void {
    this.filterGroupsSignal.set(structuredClone(this.appliedGroupsSignal()));
    this.mainOperatorSignal.set(this.appliedMainOperatorSignal());

    const dialogRef = this.dialog.open(AdvancedSearchDialogComponent, {
      width: '80vw',
      height: '80vh',
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result === 'submit') {
        this.setAppliedGroups(this.filterGroupsSignal());
        this.setAppliedMainOperator(this.mainOperatorSignal());
      } else {
        this.filterGroupsSignal.set(this.appliedGroupsSignal());
        this.mainOperatorSignal.set(this.appliedMainOperatorSignal());
      }
    });
  }

  addGroup(): void {
    const current = this.filterGroupsSignal();
    this.filterGroupsSignal.set([...current, {filters: [], operator: SolrOperators.and}]);
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
      current[index] = {...current[index], filters};
      this.filterGroupsSignal.set(current);
    }
  }

  updateGroupOperator(index: number, operator: SolrOperators): void {
    const current = [...this.filterGroupsSignal()];
    if (current[index]) {
      current[index] = {...current[index], operator};
      this.filterGroupsSignal.set(current);
    }
  }

  isAdvancedSearchActive(): boolean {
    return this.appliedGroupsSignal().some(group =>
      group.filters.some(f => f.elementValue?.trim()),
    );
  }

  getAdvancedSearchPreviewGroups = computed(() => {
    const mainOp = this.appliedMainOperatorSignal();

    return this.appliedGroupsSignal().map(group => {
      const filters = group.filters
        .filter(f => !!f.elementValue?.trim())
        .map(f => ({
          label: f.label,
          value: f.elementValue,
          isEquals: f.isEquals
        }));

      return {
        operator: group.operator,
        filters,
      };
    }).filter(group => group.filters.length > 0);
  });

  resetFromParams(params: Params): void {
    const rawQuery = params['advSearch'];
    const mainOperator = (params['advOp'] as SolrOperators) || SolrOperators.and;
    if (!rawQuery) return;

    const groups: FilterGroup[] = [];

    // Check if the entire query is wrapped in parentheses and determine if it's a single group or multiple groups
    let cleanQuery = rawQuery.trim();
    let isSingleGroup = false;

    if (cleanQuery.startsWith('(') && cleanQuery.endsWith(')')) {
      // Check if these are the outermost parentheses
      let depth = 0;
      let isOutermost = true;
      for (let i = 0; i < cleanQuery.length - 1; i++) {
        if (cleanQuery[i] === '(') depth++;
        if (cleanQuery[i] === ')') depth--;
        if (depth === 0) {
          isOutermost = false;
          break;
        }
      }
      if (isOutermost) {
        const innerContent = cleanQuery.slice(1, -1).trim();
        const mainOperatorStr = mainOperator === SolrOperators.or ? SolrOperators.or : SolrOperators.and;
        const potentialSplit = this.splitByTopLevelOperator(innerContent, mainOperatorStr);

        // Check if this looks like multiple groups (each part should be a complete group, likely wrapped in parentheses)
        // vs a single group with multiple filters (field:value pairs)
        let looksLikeMultipleGroups = false;

        if (potentialSplit.length > 1) {
          // Check if each split part looks like a complete group (wrapped in parentheses or complex structure)
          looksLikeMultipleGroups = potentialSplit.every(part => {
            const trimmedPart = part.trim();
            // If it starts with parentheses, it's likely a group
            // If it contains multiple field:value pairs or complex structure, it might be a group
            return trimmedPart.startsWith('(') && trimmedPart.endsWith(')');
          });
        }

        if (looksLikeMultipleGroups) {
          // Multiple groups - remove outer parentheses and split
          cleanQuery = innerContent;
          isSingleGroup = false;
        } else {
          // Single group - keep as is and mark as single group
          cleanQuery = innerContent;
          isSingleGroup = true;
        }
      }
    }

    // Split by the main operator only if it's not a single wrapped group
    const mainOperatorStr = mainOperator === SolrOperators.or ? SolrOperators.or : SolrOperators.and;
    const groupParts = isSingleGroup ? [cleanQuery] : this.splitByTopLevelOperator(cleanQuery, mainOperatorStr);

    for (const groupRaw of groupParts) {
      const cleaned = groupRaw.trim();

      // Remove outer parentheses from individual groups
      let groupContent = cleaned;
      if (groupContent.startsWith('(') && groupContent.endsWith(')')) {
        // Check if these parentheses wrap the entire group content
        let depth = 0;
        let isOutermost = true;
        for (let i = 0; i < groupContent.length - 1; i++) {
          if (groupContent[i] === '(') depth++;
          if (groupContent[i] === ')') depth--;
          if (depth === 0) {
            isOutermost = false;
            break;
          }
        }
        if (isOutermost) {
          groupContent = groupContent.slice(1, -1).trim();
        }
      }

      // Detect the operator used within this group and split accordingly
      let parts: string[];
      let groupOperator: SolrOperators;

      // Try splitting by OR first, then by AND
      const orParts = this.splitByTopLevelOperator(groupContent, SolrOperators.or);
      const andParts = this.splitByTopLevelOperator(groupContent, SolrOperators.and);

      if (orParts.length > 1) {
        parts = orParts;
        groupOperator = SolrOperators.or;
      } else if (andParts.length > 1) {
        parts = andParts;
        groupOperator = SolrOperators.and;
      } else {
        // Single filter in group
        parts = [groupContent];
        groupOperator = SolrOperators.and;
      }

      const filters: AdvancedFilterDefinition[] = [];

      for (let part of parts) {
        console.log('Processing part:', part);
        // check if first character is "-", if so set isEquals to false
        let isEquals = true;
        if (part.startsWith('-')) {
          isEquals = false;
        }

        // Remove leading '-' if present
        if (isEquals === false) {
          part = part.slice(1).trim();
        }


        const trimmedPart = part.trim();
        const match = trimmedPart.match(/^(.+?):(.+)$/);
        if (!match) continue;

        const solrField = match[1];
        console.log('solrField:', solrField);
        let rawValue = match[2].trim();
        let value = rawValue;

        // Handle different value formats
        const isQuoted = value.startsWith('"') && value.endsWith('"');
        const isRange = value.startsWith('[') && value.endsWith(']') && value.includes(' TO ');
        const isWrapped = value.startsWith('(') && value.endsWith(')');

        if (!isQuoted && !isRange && isWrapped) {
          value = value.slice(1, -1).trim();
        }

        if (isQuoted) {
          value = value.slice(1, -1).trim();
        }

        if (!solrField || !value) continue;

        let base = ADVANCED_FILTERS.find(f => f.solrField === solrField || f.key === solrField);

        const isFulltext = isFulltextFilter(solrField);

        if (isFulltext) {
          base = ADVANCED_FILTERS.find(f => f.key === SolrFacetKey.Fulltext);
        }

        if (base) {
          filters.push({...base, solrValue: value.trim(), elementValue: value.trim(), isEquals});

          if (isFulltext) {
            filters[filters.length - 1].solrField = solrField;
          }
        } else {
          filters.push({
            key: solrField as any,
            label: solrField,
            inputType: FilterElementType.Text as any,
            solrField,
            solrValue: value.trim(),
            elementValue: value.trim(),
            isEquals
          });
        }
      }

      if (filters.length > 0) {
        groups.push({filters, operator: groupOperator});
      }
    }

    this.mainOperatorSignal.set(mainOperator);
    this.filterGroupsSignal.set(groups);
    this.appliedMainOperatorSignal.set(mainOperator);
    this.appliedGroupsSignal.set(groups);
  }

// Helper method to split by top-level operators (ignoring operators inside parentheses)
  private splitByTopLevelOperator(query: string, operator: string): string[] {
    const parts: string[] = [];
    let current = '';
    let depth = 0;
    let i = 0;

    while (i < query.length) {
      const char = query[i];

      if (char === '(') {
        depth++;
        current += char;
      } else if (char === ')') {
        depth--;
        current += char;
      } else if (depth === 0) {
        // Check for operator with proper word boundaries
        const remainingQuery = query.substr(i);
        const operatorPattern = new RegExp(`^\\s+${operator}\\s+`, 'i');
        const match = remainingQuery.match(operatorPattern);

        if (match) {
          // Found top-level operator
          if (current.trim()) {
            parts.push(current.trim());
          }
          current = '';
          i += match[0].length - 1; // Skip the operator and surrounding spaces (subtract 1 because i++ at end)
        } else {
          current += char;
        }
      } else {
        current += char;
      }
      i++;
    }

    // Add the last part
    if (current.trim()) {
      parts.push(current.trim());
    }

    return parts.length > 0 ? parts : [query.trim()];
  }

  get filtersContainDate() {
    return computed(() => {
      return this.appliedGroupsSignal().some(group =>
        group.filters.some(f =>
          !!f.elementValue?.trim() &&
          (f.key === SolrFacetKey.Date || f.key === SolrFacetKey.Year)
        )
      );
    });
  }

  buildDateRangeFilter(startDay: number, startMonth: number, endDay: number, endMonth: number): string {
    const filters: string[] = [];

    if (startMonth === endMonth) {
      // Same month - simple day range
      filters.push(`(date_range_start.month:${startMonth} AND date_range_start.day:[${startDay} TO ${endDay}])`);
    } else {
      // Cross multiple months

      // Starting month (from startDay to end of month)
      filters.push(`(date_range_start.month:${startMonth} AND date_range_start.day:[${startDay} TO 31])`);

      // Full months in between
      let currentMonth = startMonth + 1;
      if (currentMonth > 12) currentMonth = 1; // Handle year wrap

      while (currentMonth !== endMonth) {
        filters.push(`(date_range_start.month:${currentMonth})`);
        currentMonth++;
        if (currentMonth > 12) currentMonth = 1; // Handle year wrap
      }

      // Ending month (from start of month to endDay)
      filters.push(`(date_range_start.month:${endMonth} AND date_range_start.day:[1 TO ${endDay}])`);
    }

    return `(${filters.join(' OR ')})`;
  }

  hasFulltextFilter(): boolean {
    return this.appliedGroupsSignal().some(group =>
      group.filters.some(f => isFulltextFilter(f.solrField || '') && !!f.elementValue?.trim())
    );
  }

}
