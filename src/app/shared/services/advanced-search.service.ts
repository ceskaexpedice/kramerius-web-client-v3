import {computed, inject, Injectable, Signal, signal} from '@angular/core';
import {AdvancedSearchDialogComponent} from '../dialogs/advanced-search-dialog/advanced-search-dialog.component';
import {MatDialog} from '@angular/material/dialog';

export interface FilterGroup {}

@Injectable({
  providedIn: 'root'
})
export class AdvancedSearchService {

  private pendingFilters = signal<string[]>([]);
  private pendingOperators = signal<Record<string, 'AND' | 'OR'>>({});

  filters = computed(() => this.pendingFilters());
  operators = computed(() => this.pendingOperators());

  dialog = inject(MatDialog);

  constructor() { }

  setPendingFilters(filters: string[]) {
    this.pendingFilters.set(filters);
  }

  setPendingOperators(ops: Record<string, 'AND' | 'OR'>) {
    this.pendingOperators.set(ops);
  }

  clear() {
    this.pendingFilters.set([]);
    this.pendingOperators.set({});
  }

  getFilters() {
    return this.pendingFilters();
  }

  getOperators() {
    return this.pendingOperators();
  }

  // actions
  openDialog(): void {
    const dialogRef = this.dialog.open(AdvancedSearchDialogComponent, {
      width: '80vw',
      height: '80vh',
      // data: { filters: this.currentFilter }
    });

    dialogRef.afterClosed().subscribe((result: any) => {
      if (result) {
      }
    });
  }

  addGroup(): void {

  }

  removeGroup(index: number): void {

  }
}
