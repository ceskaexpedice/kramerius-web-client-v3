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
  @Input() selectedPid: string = '';
  @Output() selectionChanged = new EventEmitter<DocumentHierarchyItem>();

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
    if (active && this.selectedPid !== item.pid) {
      this.selectedPid = item.pid;
      this.selectionChanged.emit(item);
    }
  }

  isSelected(item: DocumentHierarchyItem): boolean {
    return this.selectedPid === item.pid;
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
      const shareableTypes = this.recordHandlerService.getShareableDocumentTypes(document);
      const mappedItems = shareableTypes.map(type => ({
        model: type.model,
        pid: type.pid
      }));
      allHierarchyItems.push(...mappedItems);
    });

    // Remove duplicates based on model type, not pid
    // For each model type, keep only the first occurrence
    const uniqueItemsByModel = allHierarchyItems.filter((item, index, self) =>
      index === self.findIndex(t => t.model === item.model)
    );

    // Sort by hierarchy level (periodical -> volume -> item -> page)
    const hierarchyOrder = ['periodical', 'periodicalvolume', 'periodicalitem', 'page'];
    this.hierarchyItems = uniqueItemsByModel.sort((a, b) => {
      const aIndex = hierarchyOrder.indexOf(a.model);
      const bIndex = hierarchyOrder.indexOf(b.model);
      return aIndex - bIndex;
    });

    // Auto-select first item if no selection provided
    if (!this.selectedPid && this.hierarchyItems.length > 0) {
      this.selectedPid = this.hierarchyItems[0].pid;
      this.selectionChanged.emit(this.hierarchyItems[0]);
    }
  }

  trackByPid(index: number, item: DocumentHierarchyItem): string {
    return item.pid;
  }
}
