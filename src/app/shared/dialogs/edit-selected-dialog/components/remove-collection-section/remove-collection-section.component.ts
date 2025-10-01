import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import {CollectionsListComponent} from '../../../../components/collections-list/collections-list.component';
import {Observable} from 'rxjs';
import {Store} from '@ngrx/store';
import {selectCollectionsTotalCount} from '../../../../state/collections/collections.selectors';

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
  styleUrls: ['./remove-collection-section.component.scss', '../edit-selected-dialog-section.scss']
})
export class RemoveCollectionSectionComponent {

  totalCount$: Observable<number>;

  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<RemoveCollectionSectionData>();
  @Output() actionClick = new EventEmitter<void>();

  selectedCollections: string[] = [];

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

  onActionClick() {
    this.actionClick.emit();
  }
}
