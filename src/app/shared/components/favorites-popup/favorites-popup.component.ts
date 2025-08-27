import {Component, EventEmitter, inject, Input, OnInit, Output, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {InputComponent} from '../input/input.component';
import {Folder, selectUserOwnedFolders, selectUserFollowedFolders} from '../../../modules/saved-lists-page/state';
import * as FoldersActions from '../../../modules/saved-lists-page/state/folders.actions';
import {Observable, combineLatest, map, startWith} from 'rxjs';
import {toObservable} from '@angular/core/rxjs-interop';
import {MatCheckbox, MatCheckboxChange} from '@angular/material/checkbox';

interface FavoritesList {
  folder: Folder;
  isSelected: boolean;
}

@Component({
  selector: 'app-favorites-popup',
  standalone: true,
  imports: [
    AsyncPipe,
    NgForOf,
    NgIf,
    TranslatePipe,
    InputComponent,
    MatCheckbox,
  ],
  template: `
    <div class="favorites-popup" [class.success-state]="showSuccess()">

      <!-- Main Form State -->
      <div *ngIf="!showSuccess()" class="favorites-popup__content">
        <div class="favorites-popup__header">
          <h3>{{ 'add-to-favorites' | translate }}</h3>
        </div>

        <!-- Search existing lists -->
        <div class="favorites-popup__section" *ngIf="shouldShowSearch$ | async">
          <app-input
            [theme]="'dark'"
            [placeholder]="'search-saved-lists' | translate"
            [size]="'sm'"
            [prefixIcon]="'icon-search-normal'"
            [signalInput]="searchTerm">
          </app-input>
        </div>

        <!-- Create new list -->
        <div class="favorites-popup__section">
          <app-input
            [placeholder]="'create-new-list--placeholder' | translate"
            [label]="'create-new-list--label' | translate"
            [size]="'sm'"
            [theme]="'dark'"
            [prefixIcon]="'icon-add'"
            [signalInput]="newListName"
            (enter)="onCreateNewList()">
          </app-input>
        </div>

        <hr>

        <!-- My Saved Lists -->
        <div class="favorites-popup__section">
          <h4 class="section-title">{{ 'my-saved-lists' | translate }}</h4>

          <div class="lists-container" *ngIf="filteredLists$ | async as lists">
            <div *ngFor="let listItem of lists" class="list-item">
              <div class="list-item__content">
                <span class="list-name">{{ listItem.folder.name }}</span>
                <span class="list-count">({{ listItem.folder.itemsCount }})</span>
              </div>
              <mat-checkbox
                [checked]="listItem.isSelected"
                (change)="onListToggle(listItem.folder, $event)">
              </mat-checkbox>
            </div>
          </div>

          <div *ngIf="(filteredLists$ | async)?.length === 0" class="no-lists">
            {{ 'no-lists-found' | translate }}
          </div>
        </div>

        <!-- Actions -->
        <div class="favorites-popup__actions">
          <button class="button sm outlined tertiary" (click)="onCancel()">
            {{ 'cancel' | translate }}
          </button>
          <button
            class="button primary sm"
            [disabled]="!hasSelectedLists() && !newListName().trim()"
            (click)="onDone()">
            {{ 'done' | translate }}
          </button>
        </div>
      </div>

      <!-- Success State -->
      <div *ngIf="showSuccess()" class="favorites-popup__content">
        <div class="favorites-popup__header">
          <h3>{{ 'add-to-favorites-success--header' | translate }}</h3>
        </div>

        <hr>

        <div class="favorites-popup__section">
          {{ 'add-to-favorites-success--text' | translate }}
        </div>

        <div class="favorites-popup__actions">
          <button
            class="button primary sm"
            (click)="onCloseSuccess()">
            {{ 'OK' | translate }}
          </button>
        </div>
      </div>
    </div>
  `,
  styles: `
    .favorites-popup {
      width: 265px;
      max-height: 400px;
      background: var(--color-bg-base);
      border: 1px solid var(--color-primary);
      border-radius: 8px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      overflow: hidden;

      &.success-state {
        width: 300px;
        max-height: none;
      }
    }

    .favorites-popup__content {
      display: flex;
      flex-direction: column;
    }

    .favorites-popup__header {
      padding: var(--spacing-x3) var(--spacing-x4);
    }

    .favorites-popup__header h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: var(--color-text-base);
    }

    .favorites-popup__section {
      display: flex;
      flex-direction: column;
      padding: var(--spacing-x2) var(--spacing-x4);
    }

    .section-title {
      margin: 0;
      padding: var(--spacing-x2) 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-base);
    }

    .lists-container {
      max-height: 105px;
      overflow-y: auto;
      border: 1px solid var(--color-border-base);
    }

    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-x2) 0;
      transition: background-color 0.2s ease;

      &:hover {
        background-color: var(--color-bg-hover);
      }
    }

    .list-item__content {
      display: flex;
      align-items: center;
      gap: var(--spacing-x2);
      flex: 1;
    }

    .list-name {
      font-weight: 500;
      font-size: 14px;
      color: var(--color-text-base);
    }

    .list-count {
      color: var(--color-text-light);
      font-size: 12px;
    }

    .no-lists {
      text-align: center;
      color: var(--color-text-light);
      padding: var(--spacing-x4);
      font-style: italic;
    }

    .favorites-popup__actions {
      display: flex;
      gap: var(--spacing-x3);
      justify-content: flex-end;
      border-top: 1px solid var(--color-border-light);
      padding: 12px 16px;
    }

    .favorites-popup__success {
      padding: var(--spacing-x6);
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-x4);
    }

    .success-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--spacing-x2);
    }

    .success-icon {
      font-size: 48px;
      color: var(--color-success);
    }

    .success-header h3 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
      color: var(--color-text-base);
    }

    .success-message {
      margin: 0;
      color: var(--color-text-base);
      line-height: 1.5;
    }

    hr {
      border: none;
      height: 1px;
      background-color: var(--color-border-light);
      margin: 0;
    }
  `
})
export class FavoritesPopupComponent implements OnInit {
  @Input() itemId!: string;
  @Input() currentFolderId?: string;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<void>();

  private store = inject(Store);

  searchTerm = signal('');
  newListName = signal('');
  selectedFolderIds = signal<Set<string>>(new Set());
  showSuccess = signal(false);

  ownedFolders$ = this.store.select(selectUserOwnedFolders);
  followedFolders$ = this.store.select(selectUserFollowedFolders);

  // Combine owned and followed folders
  allFolders$ = combineLatest([
    this.ownedFolders$,
    this.followedFolders$
  ]).pipe(
    map(([owned, followed]) => [...owned, ...followed])
  );

  // Observable to determine if search should be shown
  shouldShowSearch$ = this.allFolders$.pipe(
    map(folders => folders.length > 10)
  );

  // Computed property for filtered lists
  get filteredLists(): FavoritesList[] {
    // We'll update this manually since signals and observables don't mix well
    return [];
  }

  // For template usage with search filtering
  filteredLists$ = combineLatest([
    this.allFolders$,
    toObservable(this.searchTerm).pipe(startWith('')),
    toObservable(this.selectedFolderIds).pipe(startWith(new Set<string>()))
  ]).pipe(
    map(([folders, searchTerm, selectedFolderIds]) => {
      let filteredFolders = folders;

      // Apply search filter if search term exists
      if (searchTerm && searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        filteredFolders = folders.filter(folder =>
          folder.name.toLowerCase().includes(searchLower)
        );
      }

      // Map to FavoritesList format with selection state
      return filteredFolders.map(folder => ({
        folder,
        isSelected: selectedFolderIds.has(folder.uuid)
      }));
    })
  );

  ngOnInit() {
    // Pre-check the current folder if provided
    if (this.currentFolderId) {
      const selected = new Set(this.selectedFolderIds());
      selected.add(this.currentFolderId);
      this.selectedFolderIds.set(selected);
    }
  }


  onListToggle(folder: Folder, change: MatCheckboxChange) {
    const selected = new Set(this.selectedFolderIds());
    if (change.checked) {
      selected.add(folder.uuid);
    } else {
      selected.delete(folder.uuid);
    }
    this.selectedFolderIds.set(selected);
  }

  onCreateNewList() {
    const listName = this.newListName().trim();
    if (!listName) return;

    this.store.dispatch(FoldersActions.createFolder({
      folder: { name: listName }
    }));

    // Clear the input after creating
    this.newListName.set('');
  }

  hasSelectedLists(): boolean {
    return this.selectedFolderIds().size > 0;
  }

  onCancel() {
    this.close.emit();
  }

  onDone() {
    const newListName = this.newListName().trim();
    const selectedIds = Array.from(this.selectedFolderIds());

    if (newListName) {
      // Create new list and add item to it
      this.store.dispatch(FoldersActions.createFolder({
        folder: { name: newListName }
      }));
    }

    // Add item to selected existing lists
    selectedIds.forEach(folderId => {
      this.store.dispatch(FoldersActions.updateFolderItems({
        request: {
          uuid: folderId,
          items: [this.itemId]
        }
      }));
    });

    // Show success state
    this.showSuccess.set(true);
  }

  onCloseSuccess() {
    this.success.emit();
    this.close.emit();
  }
}
