import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {CollectionsListComponent} from '../../../../components/collections-list/collections-list.component';

export interface RemoveCollectionSectionData {
  selectedIds: string[];
  selectedCollections: string[];
}

@Component({
  selector: 'app-remove-collection-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CollectionsListComponent,
    CollectionsListComponent,
  ],
  templateUrl: './remove-collection-section.component.html',
  styleUrl: './remove-collection-section.component.scss'
})
export class RemoveCollectionSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<RemoveCollectionSectionData>();

  selectedCollections: string[] = [];

  onCollectionsSelectionChange(selectedCollections: string[]) {
    this.selectedCollections = selectedCollections;
    this.emitChange();
  }

  private emitChange() {
    this.dataChange.emit({
      selectedIds: this.selectedIds,
      selectedCollections: [...this.selectedCollections]
    });
  }
}
