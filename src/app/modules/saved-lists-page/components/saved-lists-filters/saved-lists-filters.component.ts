import {Component, inject, Input, signal} from '@angular/core';
import {toObservable} from '@angular/core/rxjs-interop';
import {Router} from '@angular/router';
import {TranslatePipe} from '@ngx-translate/core';
import {
  CollapsibleCategoryComponent
} from '../../../../shared/components/collapsible-category/collapsible-category.component';
import {Folder, FolderDetails, selectUserFollowedFolders, selectUserOwnedFolders} from '../../state';
import * as FoldersActions from '../../state/folders.actions';
import {Store} from '@ngrx/store';
import {FoldersService} from '../../services/folders.service';
import {AsyncPipe} from '@angular/common';
import {InputComponent} from '../../../../shared/components/input/input.component';
import {map, startWith} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {APP_ROUTES_ENUM} from '../../../../app.routes';

@Component({
  selector: 'app-saved-lists-filters',
  standalone: true,
  styles: `
    .filter-section-title {
      font-size: var(--font-size-small);
      font-weight: 500;
      color: var(--color-text-base);
      margin-bottom: var(--spacing-x3);
      cursor: pointer;

      .count {
        color: var(--color-text-light);
      }

      &.active {
        color: var(--color-primary);
        font-weight: 700;

        .count {
          color: var(--color-text-tertiary);
        }
      }
    }
  `,
  imports: [
    TranslatePipe,
    CollapsibleCategoryComponent,
    AsyncPipe,
    InputComponent,
  ],
  template: `
    <div class="filters-content">

      <app-input
        [theme]="'dark'"
        [placeholder]="'search-in-saved-list--placeholder' | translate"
        [size]="'sm'"
        [prefixIcon]="'icon-search-normal-1'"
        [showHelpButton]="false"
        [showClearButton]="true"
        [showSubmitButton]="false" [showMicButton]="true"
        [type]="'text'"
        (valueChange)="searchValueChanged($event)"
        [signalInput]="search"
      >
      </app-input>


      <hr>

      <app-collapsible-category
        [label]="'my-favorites-list--title' | translate"
        [labelIcon]="'icon-heart'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of filteredFolders | async; track folder.uuid) {
          <div class="filter-section-title"
               (click)="changeFolder(folder)"
               [class.active]="activeFolder?.uuid === folder.uuid">
            {{ folder.name }} <span class="count">({{folder.itemsCount}})</span>
          </div>
        }

      </app-collapsible-category>

      <app-collapsible-category
        [label]="'followed-folders-list--title' | translate"
        [labelIcon]="'icon-share'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of filteredFollowedFolders | async; track folder.uuid) {
          <div class="filter-section-title"
               (click)="changeFolder(folder)"
               [class.active]="activeFolder?.uuid === folder.uuid">
            {{ folder.name }} <span class="count">({{getOwnerOfFolder(folder)}})</span>
          </div>
        }

      </app-collapsible-category>

    </div>
  `,
})
export class SavedListsFiltersComponent {

  @Input() activeFolder: FolderDetails | null = {} as FolderDetails;

  private store = inject(Store);
  private router = inject(Router);
  private foldersService = inject(FoldersService);

  search = signal('');

  private allFolders = this.store.select(selectUserOwnedFolders);
  private allFollowedFolders = this.store.select(selectUserFollowedFolders);

  filteredFolders = combineLatest([
    this.allFolders,
    toObservable(this.search).pipe(startWith(''))
  ]).pipe(
    map(([folders, searchTerm]: [Folder[], string]) => {
      let filteredFolders = folders;

      if (searchTerm && searchTerm.trim() !== '') {
        filteredFolders = folders?.filter(folder =>
          folder.name.toLowerCase().includes(searchTerm.toLowerCase())
        ) || [];
      }

      // Sort folders with favorites first
      return this.foldersService.sortFoldersWithFavoritesFirst(filteredFolders);
    })
  );

  filteredFollowedFolders = combineLatest([
    this.allFollowedFolders,
    toObservable(this.search).pipe(startWith(''))
  ]).pipe(
    map(([folders, searchTerm]: [Folder[], string]) => {
      if (!searchTerm || searchTerm.trim() === '') {
        return folders;
      }
      return folders?.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
      ) || [];
    })
  );


  changeFolder(folder: Folder) {
    // Update the URL to the selected folder
    this.router.navigate([`/${APP_ROUTES_ENUM.SAVED_LISTS}`, folder.uuid]);

    // Select the folder and load its details
    this.store.dispatch(FoldersActions.selectFolder({ folder }));
    this.store.dispatch(FoldersActions.loadFolderDetails({ uuid: folder.uuid }));
  }

  searchValueChanged(value: string | number) {
    this.search.set(value.toString());
  }

  getOwnerOfFolder(folder: Folder): string {
    if (folder.users && folder.users.length > 0 && folder.users[0].length > 0) {
      const owner = folder.users[0].find(user => user.userRole === 'owner');
      return owner ? owner.userId : 'Unknown';
    }
    return 'Unknown';
  }

}
