import { computed, inject, Injectable, signal } from '@angular/core';
import { AdvancedSearchDialogComponent } from '../dialogs/advanced-search-dialog/advanced-search-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import {AdvancedFilterDefinition} from '../dialogs/advanced-search-dialog/advanced-filters';
import {SolrOperators} from '../../core/solr/solr-helpers';

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

  private filterGroupsSignal = signal<FilterGroup[]>([]);

  filters = computed(() => this.pendingFiltersSignal());
  operators = computed(() => this.pendingOperatorsSignal());
  pendingGroups = computed(() => this.filterGroupsSignal());

  private dialog = inject(MatDialog);

  constructor() {}

  // Legacy (active filters)
  setPendingFilters(filters: string[]) {
    this.pendingFiltersSignal.set(filters);
  }

  setPendingOperators(ops: Record<string, SolrOperators>) {
    this.pendingOperatorsSignal.set(ops);
  }

  clear() {
    this.pendingFiltersSignal.set([]);
    this.pendingOperatorsSignal.set({});
    this.filterGroupsSignal.set([]);
  }

  getFilters() {
    return this.pendingFiltersSignal();
  }

  getOperators() {
    return this.pendingOperatorsSignal();
  }

  // Dialog control
  openDialog(): void {
    const dialogRef = this.dialog.open(AdvancedSearchDialogComponent, {
      width: '80vw',
      height: '80vh'
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
        // handle results here if needed
      }
    });
  }

  // Group logic
  addGroup(): void {
    const current = this.filterGroupsSignal();
    this.filterGroupsSignal.set([...current, { filters: [], operator: SolrOperators.and }]);
  }

  removeGroup(index: number): void {
    const current = [...this.filterGroupsSignal()];
    current.splice(index, 1);
    this.filterGroupsSignal.set(current);
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
}
