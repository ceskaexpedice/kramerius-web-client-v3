import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import {CollectionsListComponent} from '../../../../components/collections-list/collections-list.component';
import {selectCollectionSearchResultsTotalCount} from '../../../../state/collections/collections.selectors';

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
export class AddCollectionSectionComponent implements OnInit, OnChanges {
  @Input() selectedIds: string[] = [];
  @Output() dataChange = new EventEmitter<AddCollectionSectionData>();
  @Output() actionClick = new EventEmitter<void>();

  selectedCollections: string[] = [];
  totalCount$: Observable<number>;

  constructor(private store: Store) {
    this.totalCount$ = this.store.select(selectCollectionSearchResultsTotalCount);
  }

  ngOnInit() {
    // Emit initial data when component initializes
    this.emitChange();
  }

  ngOnChanges(changes: SimpleChanges) {
    // Emit data when selectedIds input changes
    if (changes['selectedIds']) {
      this.emitChange();
    }
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
