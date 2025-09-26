import { Component, Input, Output, EventEmitter, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { SearchDocument } from '../../../modules/models/search-document';
import { selectCollections, selectCollectionsLoading, selectCollectionsError } from '../../state/collections/collections.selectors';
import { loadCollections } from '../../state/collections/collections.actions';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './collections-list.component.html',
  styleUrl: './collections-list.component.scss'
})
export class CollectionsListComponent implements OnInit {

  @Input() selectedCollections: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();
  @Input() title: string = '';


  collections$: Observable<SearchDocument[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;

  constructor(private store: Store) {
    this.collections$ = this.store.select(selectCollections);
    this.loading$ = this.store.select(selectCollectionsLoading);
    this.error$ = this.store.select(selectCollectionsError);
  }

  ngOnInit() {
    this.store.dispatch(loadCollections());
  }

  onCollectionToggle(collectionPid: string, checked: boolean) {
    const currentSelection = [...this.selectedCollections];

    if (checked) {
      if (!currentSelection.includes(collectionPid)) {
        currentSelection.push(collectionPid);
      }
    } else {
      const index = currentSelection.indexOf(collectionPid);
      if (index > -1) {
        currentSelection.splice(index, 1);
      }
    }

    this.selectionChange.emit(currentSelection);
  }

  isCollectionSelected(collectionPid: string): boolean {
    return this.selectedCollections.includes(collectionPid);
  }

  selectAll(collections: SearchDocument[]) {
    const allPids = collections.map(c => c.pid);
    this.selectionChange.emit(allPids);
  }

  clearAll() {
    this.selectionChange.emit([]);
  }
}
