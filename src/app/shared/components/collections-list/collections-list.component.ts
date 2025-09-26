import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Store } from '@ngrx/store';
import { Observable, Subject, fromEvent } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SearchDocument } from '../../../modules/models/search-document';
import {
  selectCollections,
  selectCollectionsLoading,
  selectCollectionsError,
  selectCollectionsQuery,
  selectCollectionsHasMore,
  selectCollectionsTotalCount
} from '../../state/collections/collections.selectors';
import {
  loadCollections,
  searchCollections,
  loadMoreCollections,
  clearCollectionsSearch
} from '../../state/collections/collections.actions';

@Component({
  selector: 'app-collections-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatInputModule,
    MatFormFieldModule,
    MatIconModule,
    MatButtonModule,
    ScrollingModule,
    FormsModule,
    TranslateModule
  ],
  templateUrl: './collections-list.component.html',
  styleUrl: './collections-list.component.scss'
})
export class CollectionsListComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() selectedCollections: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();
  @Input() title: string = '';

  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef;

  collections$: Observable<SearchDocument[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  query$: Observable<string>;
  hasMore$: Observable<boolean>;
  totalCount$: Observable<number>;

  searchQuery: string = '';
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.collections$ = this.store.select(selectCollections);
    this.loading$ = this.store.select(selectCollectionsLoading);
    this.error$ = this.store.select(selectCollectionsError);
    this.query$ = this.store.select(selectCollectionsQuery);
    this.hasMore$ = this.store.select(selectCollectionsHasMore);
    this.totalCount$ = this.store.select(selectCollectionsTotalCount);
  }

  ngOnInit() {
    this.store.dispatch(loadCollections({ reset: true }));
  }

  ngAfterViewInit() {
    this.setupScrollListener();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setupScrollListener() {
    if (this.scrollContainer) {
      fromEvent(this.scrollContainer.nativeElement, 'scroll')
        .pipe(
          takeUntil(this.destroy$),
          debounceTime(100)
        )
        .subscribe(() => this.onScroll());
    }
  }

  onScroll() {
    if (!this.scrollContainer) return;

    const element = this.scrollContainer.nativeElement;
    const threshold = 100; // Load more when 100px from bottom

    if (element.scrollTop + element.clientHeight >= element.scrollHeight - threshold) {
      // this.loadMore();
    }
  }

  onSearchInput() {
    if (this.searchQuery.trim()) {
      this.store.dispatch(searchCollections({ query: this.searchQuery.trim() }));
    } else {
      this.clearSearch();
    }
  }

  clearSearch() {
    this.searchQuery = '';
    this.store.dispatch(clearCollectionsSearch());
    this.store.dispatch(loadCollections({ reset: true }));
  }

  loadMore() {
    this.store.dispatch(loadMoreCollections());
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

  trackByPid(index: number, collection: SearchDocument): string {
    return collection.pid;
  }
}
