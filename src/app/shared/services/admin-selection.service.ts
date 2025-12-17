import { Injectable, computed, inject } from '@angular/core';
import { SearchDocument } from '../../modules/models/search-document';
import { SelectionService } from './selection.service';
import { AdminModeService } from './admin-mode.service';

export interface AdminSelectionState {
  selectedIds: Set<string>;
  isAdminMode: boolean;
  currentPageItems: SearchDocument[];
}

/**
 * @deprecated Use SelectionService for general selection functionality and AdminModeService for admin-specific functionality
 * This service is maintained for backward compatibility
 */
@Injectable({
  providedIn: 'root'
})
export class AdminSelectionService {
  private selectionService = inject(SelectionService);
  private adminModeService = inject(AdminModeService);

  // Delegate selection functionality to SelectionService
  readonly selectedCount = this.selectionService.selectedCount;
  readonly hasSelection = this.selectionService.hasSelection;
  readonly isAllVisibleSelected = this.selectionService.isAllVisibleSelected;
  readonly isSomeVisibleSelected = this.selectionService.isSomeVisibleSelected;

  // Delegate admin mode functionality to AdminModeService
  readonly adminMode = this.adminModeService.adminMode;

  toggleAdminMode(): void {
    this.adminModeService.toggleAdminMode();
  }

  setAdminMode(enabled: boolean): void {
    this.adminModeService.setAdminMode(enabled);
  }

  updateCurrentPageItems(items: SearchDocument[]): void {
    this.selectionService.updateCurrentPageItems(items);
  }

  isSelected(itemId: string): boolean {
    return this.selectionService.isSelected(itemId);
  }

  toggleItem(itemId: string): void {
    this.selectionService.toggleItem(itemId);
  }

  selectItem(itemId: string): void {
    this.selectionService.selectItem(itemId);
  }

  deselectItem(itemId: string): void {
    this.selectionService.deselectItem(itemId);
  }

  selectAllVisible(): void {
    this.selectionService.selectAllVisible();
  }

  deselectAllVisible(): void {
    this.selectionService.deselectAllVisible();
  }

  toggleAllVisible(): void {
    this.selectionService.toggleAllVisible();
  }

  clearSelection(): void {
    this.selectionService.clearSelection();
  }

  getSelectedIds(): string[] {
    return this.selectionService.getSelectedIds();
  }

  getSelectedItems(): SearchDocument[] {
    return this.selectionService.getSelectedItems();
  }

  getSelectionSummary(): string {
    return this.selectionService.getSelectionSummary();
  }

}
