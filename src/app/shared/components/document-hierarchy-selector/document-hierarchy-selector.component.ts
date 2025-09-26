import { Component, EventEmitter, inject, Input, OnInit, Output } from '@angular/core';
import { NgForOf } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { ButtonToggleComponent } from '../button-toggle/button-toggle.component';
import { RecordHandlerService } from '../../services/record-handler.service';
import { Metadata } from '../../models/metadata.model';

export interface DocumentHierarchyItem {
  model: string;
  pid: string;
}

@Component({
  selector: 'app-document-hierarchy-selector',
  imports: [
    NgForOf,
    TranslatePipe,
    ButtonToggleComponent
  ],
  templateUrl: './document-hierarchy-selector.component.html',
  styleUrl: './document-hierarchy-selector.component.scss'
})
export class DocumentHierarchySelectorComponent implements OnInit {
  @Input() selectedPid: string = ''; // Keep for backward compatibility
  @Input() selectedModel: string = ''; // New: track selection by model
  @Output() selectionChanged = new EventEmitter<DocumentHierarchyItem>();
  @Input() allHierarchyLevels = false; // If true, show all levels even if not present in documents

  hierarchyItems: DocumentHierarchyItem[] = [];
  private _documents: Metadata[] = [];
  private recordHandlerService = inject(RecordHandlerService);

  // Support single document input (backward compatibility)
  @Input() set document(doc: Metadata) {
    if (doc) {
      this._documents = [doc];
      if (this._documents.length > 0) {
        this.loadHierarchyItems();
      }
    }
  }

  // Support multiple documents input (admin mode)
  @Input() set documents(docs: Metadata[]) {
    if (docs && docs.length > 0) {
      this._documents = docs;
      this.loadHierarchyItems();
    }
  }

  onToggled(active: boolean, item: DocumentHierarchyItem): void {
    if (active && this.getSelectedValue() !== this.getItemValue(item)) {
      // Update both selectedModel and selectedPid for compatibility
      this.selectedModel = item.model;
      if (item.pid) {
        this.selectedPid = item.pid;
      }
      this.selectionChanged.emit(item);
    }
  }

  isSelected(item: DocumentHierarchyItem): boolean {
    // Use model-based selection when allHierarchyLevels is true and PIDs are empty
    // Otherwise fall back to PID-based selection for backward compatibility
    if (this.allHierarchyLevels && !item.pid) {
      return this.selectedModel === item.model;
    }
    return this.selectedPid === item.pid;
  }

  private getSelectedValue(): string {
    // Get the current selection value (model or pid based on mode)
    if (this.allHierarchyLevels && this.selectedModel) {
      return this.selectedModel;
    }
    return this.selectedPid;
  }

  private getItemValue(item: DocumentHierarchyItem): string {
    // Get the item's value (model or pid based on mode)
    if (this.allHierarchyLevels && !item.pid) {
      return item.model;
    }
    return item.pid;
  }

  ngOnInit(): void {
    if (this._documents.length > 0) {
      this.loadHierarchyItems();
    }
  }

  private loadHierarchyItems(): void {
    const allHierarchyItems: DocumentHierarchyItem[] = [];

    // Process each document
    this._documents.forEach(document => {
      const shareableTypes = this.allHierarchyLevels ? this.recordHandlerService.getDocumentHierarchyLevels(document) : this.recordHandlerService.getShareableDocumentTypes(document);
      const mappedItems = shareableTypes.map(type => ({
        model: type.model,
        pid: type.pid ?? ''
      }));
      allHierarchyItems.push(...mappedItems);
    });

    // Remove duplicates based on model type, not pid
    // For each model type, keep only the first occurrence
    // const uniqueItemsByModel = allHierarchyItems.filter((item, index, self) =>
    //   index === self.findIndex(t => t.model === item.model)
    // );

    this.hierarchyItems = allHierarchyItems;

    // Auto-select first item if no selection provided
    if (!this.getSelectedValue() && this.hierarchyItems.length > 0) {
      const firstItem = this.hierarchyItems[0];
      this.selectedModel = firstItem.model;
      if (firstItem.pid) {
        this.selectedPid = firstItem.pid;
      }
      this.selectionChanged.emit(firstItem);
    }
  }

  trackByPid(_: number, item: DocumentHierarchyItem): string {
    // Use pid if available, otherwise use model for tracking
    return item.pid || item.model;
  }
}
