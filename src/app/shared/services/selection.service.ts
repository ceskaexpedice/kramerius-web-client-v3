import { Injectable, signal, computed } from '@angular/core';
import { SearchDocument } from '../../modules/models/search-document';

export interface SelectionState {
  selectedIds: Set<string>;
  currentPageItems: SearchDocument[];
  isSelectionMode: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SelectionService {
  private selectedIds = signal<Set<string>>(new Set());
  private currentPageItems = signal<SearchDocument[]>([]);
  private isSelectionMode = signal<boolean>(false);

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedIds().size > 0);
  readonly selectionMode = computed(() => this.isSelectionMode());
  
  readonly isAllVisibleSelected = computed(() => {
    const currentItems = this.currentPageItems();
    const selectedSet = this.selectedIds();
    
    if (currentItems.length === 0) return false;
    
    return currentItems.every(item => selectedSet.has(item.pid));
  });

  readonly isSomeVisibleSelected = computed(() => {
    const currentItems = this.currentPageItems();
    const selectedSet = this.selectedIds();
    
    return currentItems.some(item => selectedSet.has(item.pid)) && 
           !this.isAllVisibleSelected();
  });

  toggleSelectionMode(): void {
    this.isSelectionMode.update(current => {
      const newValue = !current;
      if (!newValue) {
        this.clearSelection();
      }
      return newValue;
    });
  }

  setSelectionMode(enabled: boolean): void {
    this.isSelectionMode.set(enabled);
    if (!enabled) {
      this.clearSelection();
    }
  }

  updateCurrentPageItems(items: SearchDocument[]): void {
    this.currentPageItems.set(items);
  }

  isSelected(itemId: string): boolean {
    return this.selectedIds().has(itemId);
  }

  toggleItem(itemId: string): void {
    this.selectedIds.update(currentSet => {
      const newSet = new Set(currentSet);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  }

  selectItem(itemId: string): void {
    this.selectedIds.update(currentSet => {
      const newSet = new Set(currentSet);
      newSet.add(itemId);
      return newSet;
    });
  }

  deselectItem(itemId: string): void {
    this.selectedIds.update(currentSet => {
      const newSet = new Set(currentSet);
      newSet.delete(itemId);
      return newSet;
    });
  }

  selectAllVisible(): void {
    this.selectedIds.update(currentSet => {
      const newSet = new Set(currentSet);
      this.currentPageItems().forEach(item => newSet.add(item.pid));
      return newSet;
    });
  }

  deselectAllVisible(): void {
    this.selectedIds.update(currentSet => {
      const newSet = new Set(currentSet);
      this.currentPageItems().forEach(item => newSet.delete(item.pid));
      return newSet;
    });
  }

  toggleAllVisible(): void {
    if (this.isAllVisibleSelected()) {
      this.deselectAllVisible();
    } else {
      this.selectAllVisible();
    }
  }

  clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  getSelectedIds(): string[] {
    return Array.from(this.selectedIds());
  }

  getSelectedItems(): SearchDocument[] {
    const selectedSet = this.selectedIds();
    const allKnownItems = this.currentPageItems();
    
    return allKnownItems.filter(item => selectedSet.has(item.pid));
  }

  getSelectionSummary(): string {
    const count = this.selectedCount();
    if (count === 0) return 'No items selected';
    if (count === 1) return '1 item selected';
    return `${count} items selected`;
  }
}