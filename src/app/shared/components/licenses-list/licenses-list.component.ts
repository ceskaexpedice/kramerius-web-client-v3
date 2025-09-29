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
import {Observable, Subject, combineLatest, of} from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged, map, startWith } from 'rxjs/operators';
import { License } from '../../state/licenses/licenses.actions';
import {
  selectLicenses,
  selectLicensesLoading,
  selectLicensesError,
  selectLicensesTotalCount
} from '../../state/licenses/licenses.selectors';
import {
  loadLicenses
} from '../../state/licenses/licenses.actions';
import {InputComponent} from '../input/input.component';

@Component({
  selector: 'app-licenses-list',
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
  templateUrl: './licenses-list.component.html',
  styleUrl: './licenses-list.component.scss'
})
export class LicensesListComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() selectedLicenses: string[] = [];
  @Output() selectionChange = new EventEmitter<string[]>();
  @Input() title: string = '';

  @ViewChild('scrollContainer', { static: false }) scrollContainer?: ElementRef;

  allLicenses$: Observable<License[]>;
  filteredLicenses$: Observable<License[]>;
  loading$: Observable<boolean>;
  error$: Observable<any>;
  totalCount$: Observable<number>;

  searchQuery: string = '';
  private searchQuery$ = new Subject<string>();
  private destroy$ = new Subject<void>();

  constructor(private store: Store) {
    this.allLicenses$ = this.store.select(selectLicenses);
    this.loading$ = this.store.select(selectLicensesLoading);
    this.error$ = this.store.select(selectLicensesError);
    this.totalCount$ = this.store.select(selectLicensesTotalCount);

    // Frontend filtering
    this.filteredLicenses$ = combineLatest([
      this.allLicenses$,
      this.searchQuery$.pipe(
        debounceTime(200),
        distinctUntilChanged(),
        startWith('') // Initialize with empty string
      )
    ]).pipe(
      map(([licenses, query]) => {
        if (!query || query.trim() === '') {
          return licenses;
        }

        const searchTerm = query.toLowerCase().trim();
        return licenses.filter(license =>
          license.name?.toLowerCase().includes(searchTerm) ||
          license.description?.toLowerCase().includes(searchTerm)
        );
      })
    );
  }

  ngOnInit() {
    this.store.dispatch(loadLicenses({ reset: true }));
  }

  ngAfterViewInit() {
    // No longer needed for frontend filtering
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

  onLicenseToggle(licenseName: string, checked: boolean) {
    const currentSelection = [...this.selectedLicenses];

    if (checked) {
      if (!currentSelection.includes(licenseName)) {
        currentSelection.push(licenseName);
      }
    } else {
      const index = currentSelection.indexOf(licenseName);
      if (index > -1) {
        currentSelection.splice(index, 1);
      }
    }

    this.selectionChange.emit(currentSelection);
  }

  isLicenseSelected(licenseName: string): boolean {
    return this.selectedLicenses.includes(licenseName);
  }

  selectAll(licenses: License[]) {
    const allNames = licenses.map(l => l.name);
    this.selectionChange.emit(allNames);
  }

  selectAllFiltered() {
    this.filteredLicenses$.pipe(
      takeUntil(this.destroy$)
    ).subscribe(filteredLicenses => {
      const filteredNames = filteredLicenses.map(l => l.name);
      const currentSelection = [...this.selectedLicenses];

      // Add all filtered items that aren't already selected
      filteredNames.forEach(name => {
        if (!currentSelection.includes(name)) {
          currentSelection.push(name);
        }
      });

      this.selectionChange.emit(currentSelection);
    });
  }

  clearAll() {
    this.selectionChange.emit([]);
  }

  trackByName(index: number, license: License): string {
    return license.name;
  }
}
