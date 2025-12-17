import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ElementRef,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
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
import { Observable, Subject, combineLatest } from 'rxjs';
import { debounceTime, distinctUntilChanged, map, startWith, takeUntil } from 'rxjs/operators';
import { SearchDocument } from '../../../modules/models/search-document';
import { InputComponent } from '../input/input.component';
import {
  selectAllCollections,
  selectAllCollectionsLoading,
  selectAllCollectionsError,
  selectAllCollectionsTotalCount
} from '../../state/collections/collections.selectors';
import {loadAllCollections} from '../../state/collections/collections.actions';

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
    TranslateModule,
    InputComponent,
  ],
  templateUrl: './collections-list.component.html',
  styleUrl: './collections-list.component.scss'
})
export class CollectionsListComponent implements OnInit, OnDestroy {
  @Input() selectedCollections: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();
  @Input() title: string = '';

  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef;

  allCollections$: Observable<SearchDocument[]>;
  filteredCollections$: Observable<SearchDocument[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  totalCount$: Observable<number>;

  searchQuery: string = '';
  private searchQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.allCollections$ = this.store.select(selectAllCollections);
    this.loading$ = this.store.select(selectAllCollectionsLoading);
    this.error$ = this.store.select(selectAllCollectionsError);
    this.totalCount$ = this.store.select(selectAllCollectionsTotalCount);

    // Frontend filtering
    this.filteredCollections$ = combineLatest([
      this.allCollections$,
      this.searchQuery$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        startWith('') // Initialize with empty string
      )
    ]).pipe(
      map(([collections, query]) => {
        if (!query || query.trim() === '') {
          return collections;
        }

        const searchTerm = query.toLowerCase().trim();
        return collections.filter(collection =>
          collection.title?.toLowerCase().includes(searchTerm) ||
          collection.pid?.toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  ngOnInit() {
    this.store.dispatch(loadAllCollections({ reset: true }));
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.searchQuery$.complete();
  }

  onSearchInput(value: string | number) {
    this.searchQuery = value.toString();
    this.searchQuery$.next(this.searchQuery);
  }

  clearSearch() {
    this.searchQuery = '';
    this.searchQuery$.next('');
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

  selectAllFiltered() {
    this.filteredCollections$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filteredCollections => {
      const filteredPids = filteredCollections.map(c => c.pid);
      const currentSelection = [...this.selectedCollections];

      // Add all filtered items that aren't already selected
      filteredPids.forEach(pid => {
        if (!currentSelection.includes(pid)) {
          currentSelection.push(pid);
        }
      });

      this.selectionChange.emit(currentSelection);
    });
  }

  clearAll() {
    this.selectionChange.emit([]);
  }

  trackByPid(index: number, collection: SearchDocument): string {
    return collection.pid;
  }
}
