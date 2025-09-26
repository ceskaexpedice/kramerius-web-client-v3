import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {CollectionsListComponent} from '../../../../components/collections-list/collections-list.component';

export interface AddCollectionSectionData {
  selectedIds: string[];
  selectedCollections: string[];
}

@Component({
  selector: 'app-add-collection-section',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    CollectionsListComponent,
    CollectionsListComponent,
  ],
  templateUrl: './add-collection-section.component.html',
  styleUrl: './add-collection-section.component.scss'
})
export class AddCollectionSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<AddCollectionSectionData>();

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
