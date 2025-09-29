import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {CollectionsListComponent} from '../../../../components/collections-list/collections-list.component';
import {selectCollectionsTotalCount} from '../../../../state/collections/collections.selectors';

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
  styleUrls: ['./add-collection-section.component.scss', '../edit-selected-dialog-section.scss']
})
export class AddCollectionSectionComponent {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<AddCollectionSectionData>();

  selectedCollections: string[] = [];
  totalCount$: Observable<number>;

  constructor(private store: Store) {
    this.totalCount$ = this.store.select(selectCollectionsTotalCount);
  }

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
