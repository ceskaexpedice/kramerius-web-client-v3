import { Component, Input, Output, EventEmitter, inject, computed } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import {MatRadioButton, MatRadioGroup} from '@angular/material/radio';
import {
  DocumentHierarchySelectorComponent, DocumentHierarchyItem
} from '../../../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { SelectionService } from '../../../../services/selection.service';

export interface ReindexSectionData {
  selectedIds: string[];
  scope: 'object' | 'object-and-children';
  selectedHierarchyItem?: DocumentHierarchyItem;
}

@Component({
  selector: 'app-edit-reindex-section',
  standalone: true,
  imports: [
    TranslatePipe,
    FormsModule,
    MatRadioButton,
    MatRadioGroup,
    DocumentHierarchySelectorComponent,
  ],
  templateUrl: './edit-reindex-section.component.html',
  styleUrl: './edit-reindex-section.component.scss'
})
export class EditReindexSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<ReindexSectionData>();

  selectedScope: 'object' | 'object-and-children' = 'object';
  selectedHierarchyItem?: DocumentHierarchyItem;

  private selectionService = inject(SelectionService);

  // Get selected documents as Metadata array for hierarchy selector
  selectedDocuments = computed(() => {
    return this.selectionService.getSelectedItemsAsMetadata();
  });

  onScopeChange() {
    this.emitData();
  }

  onHierarchySelectionChanged(hierarchyItem: DocumentHierarchyItem) {
    this.selectedHierarchyItem = hierarchyItem;
    this.emitData();
  }

  private emitData() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      scope: this.selectedScope,
      selectedHierarchyItem: this.selectedHierarchyItem
    });
  }
}
