import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface CollectionsSectionData {
  selectedIds: string[];
  selectedCollections?: string[];
  action?: 'add' | 'remove' | 'replace';
}

@Component({
  selector: 'app-edit-collections-section',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './edit-collections-section.component.html',
  styleUrl: './edit-collections-section.component.scss'
})
export class EditCollectionsSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<CollectionsSectionData>();

  selectedCollections: string[] = [];
  selectedAction: 'add' | 'remove' | 'replace' = 'add';

  private emitChange() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      selectedCollections: [...this.selectedCollections],
      action: this.selectedAction
    });
  }
}
