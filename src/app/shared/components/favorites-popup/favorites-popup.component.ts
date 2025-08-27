import {Component, EventEmitter, inject, Input, Output, signal} from '@angular/core';
import {Store} from '@ngrx/store';
import {AsyncPipe, NgClass, NgForOf, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {InputComponent} from '../input/input.component';
import {CheckboxComponent} from '../checkbox/checkbox.component';
import {Folder, selectUserOwnedFolders, selectUserFollowedFolders} from '../../../modules/saved-lists-page/state';
import * as FoldersActions from '../../../modules/saved-lists-page/state/folders.actions';
import {Observable, combineLatest, map, startWith} from 'rxjs';
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
    NgClass,
    NgForOf,
    NgIf,
    TranslatePipe,
    InputComponent,
    CheckboxComponent,
    MatCheckbox,
  ],
  template: `
    <div class="favorites-popup" [class.success-state]="showSuccess()">

      <!-- Main Form State -->
      <div *ngIf="!showSuccess()" class="favorites-popup__content">
        <div class="favorites-popup__header">
          <h3>{{ 'add-to-favorites' | translate }}</h3>
        </div>

<!--        &lt;!&ndash; Search existing lists &ndash;&gt;-->
<!--        <div class="favorites-popup__section">-->
<!--          <app-input-->
<!--            [placeholder]="'search-saved-lists' | translate"-->
<!--            [size]="'sm'"-->
<!--            [prefixIcon]="'icon-search-normal'"-->
<!--            [signalInput]="searchTerm"-->
<!--            (search)="onSearchChange()"-->
<!--            (enter)="onSearchChange()">-->
<!--          </app-input>-->
<!--        </div>-->

        <!-- Create new list -->
        <div class="favorites-popup__section">
          <app-input
            [placeholder]="'create-new-list-name' | translate"
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
          <button class="button outlined" (click)="onCancel()">
            {{ 'cancel' | translate }}
          </button>
          <button
            class="button primary"
            [disabled]="!hasSelectedLists() && !newListName().trim()"
            (click)="onDone()">
            {{ 'done' | translate }}
          </button>
        </div>
      </div>

      <!-- Success State -->
      <div *ngIf="showSuccess()" class="favorites-popup__success">
        <div class="success-header">
          <i class="icon-check-circle success-icon"></i>
          <h3>{{ 'done' | translate }}!</h3>
        </div>
        <p class="success-message">{{ 'item-added-to-favorites-success' | translate }}</p>
        <button class="button primary w-100" (click)="onCloseSuccess()">
          {{ 'ok' | translate }}
        </button>
      </div>
    </div>
  `,
  styles: `
    .favorites-popup {
      width: 265px;
      max-height: 335px;
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
      gap: var(--spacing-x2);
    }

    .section-title {
      margin: 0;
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-base);
    }

    .lists-container {
      max-height: 105px;
      overflow-y: auto;
      border: 1px solid var(--color-border-base);
      border-radius: 4px;
      padding: var(--spacing-x2);
    }

    .list-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-x2);
      border-radius: 4px;
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

    .button {
      padding: var(--spacing-x2) var(--spacing-x4);
      border-radius: 4px;
      border: none;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.2s ease;

      &.primary {
        background-color: var(--color-primary);
        color: white;

        &:hover:not(:disabled) {
          background-color: var(--color-primary-hover);
        }

        &:disabled {
          background-color: var(--color-bg-disabled);
          color: var(--color-text-disabled);
          cursor: not-allowed;
        }
      }

      &.outlined {
        background-color: transparent;
        border: 1px solid var(--color-border-base);
        color: var(--color-text-base);

        &:hover {
          background-color: var(--color-bg-hover);
        }
      }

      &.w-100 {
        width: 100%;
      }
    }
  `
})
export class FavoritesPopupComponent {
  @Input() itemId!: string;
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

  // Computed property for filtered lists
  get filteredLists(): FavoritesList[] {
    // We'll update this manually since signals and observables don't mix well
    return [];
  }

  // For template usage
  filteredLists$ = this.allFolders$.pipe(
    map(folders => folders.map(folder => ({
      folder,
      isSelected: this.selectedFolderIds().has(folder.uuid)
    })))
  );

  onSearchChange() {
    // Search term is already updated via signal binding
    // We could trigger a manual update here if needed
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
