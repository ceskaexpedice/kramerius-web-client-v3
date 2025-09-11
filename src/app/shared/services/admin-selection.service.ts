import { Injectable, signal, computed, inject } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SearchDocument } from '../../modules/models/search-document';

export interface AdminSelectionState {
  selectedIds: Set<string>;
  isAdminMode: boolean;
  currentPageItems: SearchDocument[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminSelectionService {
  private router = inject(Router);
  private selectedIds = signal<Set<string>>(new Set());
  private isAdminMode = signal<boolean>(false);
  private currentPageItems = signal<SearchDocument[]>([]);

  constructor() {
    // Listen to router events and disable admin mode on navigation
    // but preserve admin mode for same-page navigation (e.g., page size changes)
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (this.isAdminMode()) {
        // Only disable admin mode if we're navigating to a different page
        // Keep admin mode for same-page query parameter changes (pagination, page size)
        const currentPath = event.urlAfterRedirects.split('?')[0];
        const previousPath = event.url.split('?')[0];
        
        if (currentPath !== previousPath) {
          this.setAdminMode(false);
        }
      }
    });
  }

  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedIds().size > 0);
  readonly adminMode = computed(() => this.isAdminMode());
  
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

  toggleAdminMode(): void {
    this.isAdminMode.update(current => {
      const newValue = !current;
      if (!newValue) {
        this.clearSelection();
      }
      return newValue;
    });
  }

  setAdminMode(enabled: boolean): void {
    this.isAdminMode.set(enabled);
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