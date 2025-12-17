import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatRadioModule } from '@angular/material/radio';
import { TranslateModule } from '@ngx-translate/core';
import { AddCollectionSectionComponent, AddCollectionSectionData } from '../add-collection-section/add-collection-section.component';
import { RemoveCollectionSectionComponent, RemoveCollectionSectionData } from '../remove-collection-section/remove-collection-section.component';

export interface CollectionsSectionData {
  selectedIds: string[];
  selectedCollections?: string[];
  action?: 'add' | 'remove' | 'replace';
}

@Component({
  selector: 'app-edit-collections-section',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatRadioModule,
    TranslateModule,
    AddCollectionSectionComponent,
    RemoveCollectionSectionComponent
  ],
  templateUrl: './edit-collections-section.component.html',
  styleUrl: './edit-collections-section.component.scss'
})
export class EditCollectionsSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<CollectionsSectionData>();

  selectedAction: 'add' | 'remove' | 'replace' = 'add';
  addSectionData: AddCollectionSectionData = { selectedIds: [], selectedCollections: [] };
  removeSectionData: RemoveCollectionSectionData = { selectedIds: [], selectedCollections: [] };

  onActionChange() {
    // Reset data when action changes
    this.addSectionData = { selectedIds: this.selectedIds, selectedCollections: [] };
    this.removeSectionData = { selectedIds: this.selectedIds, selectedCollections: [] };
    this.emitChange();
  }

  onAddCollectionDataChange(data: AddCollectionSectionData) {
    this.addSectionData = data;
    if (this.selectedAction === 'add') {
      this.emitChange();
    }
  }

  onRemoveCollectionDataChange(data: RemoveCollectionSectionData) {
    this.removeSectionData = data;
    if (this.selectedAction === 'remove') {
      this.emitChange();
    }
  }

  private emitChange() {
    const currentData = this.selectedAction === 'add' ? this.addSectionData : this.removeSectionData;

    this.dataChange.emit({
      selectedIds: this.selectedIds,
      selectedCollections: currentData.selectedCollections,
      action: this.selectedAction
    });
  }
}
