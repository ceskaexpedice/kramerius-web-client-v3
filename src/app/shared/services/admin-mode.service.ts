import { computed, inject, Injectable, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { SearchDocument } from '../../modules/models/search-document';
import { Metadata } from '../models/metadata.model';
import { DocumentTypeEnum } from '../../modules/constants/document-type';

@Injectable({
  providedIn: 'root'
})
export class AdminModeService {
  private router = inject(Router);

  private isAdminMode = signal<boolean>(false);
  private selectedIds = signal<Set<string>>(new Set());
  private currentPageItems = signal<SearchDocument[]>([]);
  private adminModePath: string | null = null;

  readonly adminMode = computed(() => this.isAdminMode());
  readonly selectedCount = computed(() => this.selectedIds().size);
  readonly hasSelection = computed(() => this.selectedIds().size > 0);

  readonly isAllVisibleSelected = computed(() => {
    const items = this.currentPageItems();
    const selected = this.selectedIds();
    if (items.length === 0) return false;
    return items.every(item => selected.has(item.pid));
  });

  readonly isSomeVisibleSelected = computed(() => {
    const items = this.currentPageItems();
    const selected = this.selectedIds();
    return items.some(item => selected.has(item.pid)) && !this.isAllVisibleSelected();
  });

  constructor() {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      if (!this.isAdminMode() || this.adminModePath === null) {
        return;
      }
      const currentPath = event.urlAfterRedirects.split('?')[0];
      if (currentPath !== this.adminModePath) {
        this.disable();
      }
    });
  }

  toggle(): void {
    this.setAdminMode(!this.isAdminMode());
  }

  enable(): void {
    this.setAdminMode(true);
  }

  disable(): void {
    this.setAdminMode(false);
  }

  private setAdminMode(enabled: boolean): void {
    this.isAdminMode.set(enabled);
    if (enabled) {
      this.adminModePath = this.router.url.split('?')[0];
    } else {
      this.adminModePath = null;
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
    this.selectedIds.update(set => {
      const next = new Set(set);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  selectItem(itemId: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.add(itemId);
      return next;
    });
  }

  deselectItem(itemId: string): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      next.delete(itemId);
      return next;
    });
  }

  selectAllVisible(): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      this.currentPageItems().forEach(item => next.add(item.pid));
      return next;
    });
  }

  deselectAllVisible(): void {
    this.selectedIds.update(set => {
      const next = new Set(set);
      this.currentPageItems().forEach(item => next.delete(item.pid));
      return next;
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
    const selected = this.selectedIds();
    return this.currentPageItems().filter(item => selected.has(item.pid));
  }

  getSelectionSummary(): string {
    const count = this.selectedCount();
    if (count === 0) return 'No items selected';
    if (count === 1) return '1 item selected';
    return `${count} items selected`;
  }

  getSelectedItemsAsMetadata(): Metadata[] {
    return this.getSelectedItems().map(doc => this.toMetadata(doc));
  }

  private toMetadata(doc: SearchDocument): Metadata {
    const metadata = new Metadata();
    metadata.uuid = doc.pid;
    metadata.model = doc.model;

    if (doc.rootPid) {
      metadata.rootPid = doc.rootPid;
      metadata.rootModel = doc.rootModel || DocumentTypeEnum.periodical;
    }

    metadata.ownParentPid = doc.ownParentPid || '';
    metadata.ownParentModel = doc.ownParentModel || '';

    if (doc.ownParentPid
      && (doc.ownParentModel === DocumentTypeEnum.periodicalvolume
        || doc.ownParentModel === DocumentTypeEnum.monographunit)) {
      metadata.volume.uuid = doc.ownParentPid;
    } else if (doc.model === DocumentTypeEnum.periodicalitem && doc.ownParentPid) {
      metadata.volume.uuid = doc.ownParentPid;
    }

    return metadata;
  }
}
