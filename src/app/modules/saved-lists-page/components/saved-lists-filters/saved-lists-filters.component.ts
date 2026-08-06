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
import {MenuComponent, MenuItem} from '../../../../shared/components/menu/menu.component';
import {map, startWith} from 'rxjs/operators';
import {combineLatest} from 'rxjs';
import {APP_ROUTES_ENUM} from '../../../../app.routes';

@Component({
  selector: 'app-saved-lists-filters',
  standalone: true,
  styles: `
    .filters-content > hr {
      margin-top: var(--spacing-x5);
      margin-bottom: var(--spacing-x3);
    }

    app-collapsible-category::ng-deep .category--content {
      padding-top: var(--spacing-x3);
      gap: var(--spacing-x2);
    }

    .filter-section-title {
      font-size: var(--font-size-small);
      line-height: var(--line-height-1);
      color: var(--color-text-tertiary);
      cursor: pointer;

      .count {
        color: var(--color-text-light);
      }

      &.active {
        color: var(--color-text-link);
        font-weight: 600;

        .count {
          color: var(--color-text-tertiary);
        }
      }
    }

    .filter-section-title--with-actions {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--spacing-x2);
    }

    .filter-section-title__label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .filter-section-title__menu-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: 0 0 auto;
      padding: var(--spacing-x1);
      border: none;
      background: transparent;
      color: var(--color-text-tertiary);
      cursor: pointer;
      border-radius: var(--border-radius-small);

      &:hover {
        color: var(--color-text-base);
      }
    }
  `,
  imports: [
    TranslatePipe,
    CollapsibleCategoryComponent,
    AsyncPipe,
    InputComponent,
    MenuComponent,
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


      <hr aria-hidden="true">

      <app-collapsible-category
        [label]="'my-favorites-list--title' | translate"
        [labelIcon]="'icon-heart'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of filteredFolders | async; track folder.uuid) {
          <div class="filter-section-title"
               (click)="changeFolder(folder)"
               [class.active]="activeFolder?.uuid === folder.uuid">
            {{ displayName(folder) }} <span class="count">({{folder.itemsCount}})</span>
          </div>
        }

      </app-collapsible-category>

      <app-collapsible-category
        [label]="'followed-folders-list--title' | translate"
        [labelIcon]="'icon-share'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of filteredFollowedFolders | async; track folder.uuid) {
          <div class="filter-section-title filter-section-title--with-actions"
               (click)="changeFolder(folder)"
               [class.active]="activeFolder?.uuid === folder.uuid">
            <span class="filter-section-title__label">
              {{ folder.name }} <span class="count">({{getOwnerOfFolder(folder)}})</span>
            </span>

            <app-menu
              [customTrigger]="true"
              placement="bottom-end"
              [items]="sharedFolderMenuItems"
              (select)="onSharedFolderMenuSelect($event, folder)"
              (click)="$event.stopPropagation()">
              <button menuTrigger
                      type="button"
                      class="filter-section-title__menu-trigger"
                      [attr.aria-label]="'shared-folder-menu--aria-label' | translate">
                <i class="icon-more-horizontal" aria-hidden="true"></i>
              </button>
            </app-menu>
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

  readonly sharedFolderMenuItems: MenuItem[] = [
    {
      id: 'save',
      label: 'shared-folder-banner--save-action',
      icon: 'heart',
    },
    {
      id: 'remove',
      label: 'shared-folder-banner--remove-action',
      icon: 'trash',
      variant: 'danger',
    },
  ];

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

  onSharedFolderMenuSelect(item: MenuItem, folder: Folder) {
    if (!folder?.uuid) {
      return;
    }

    switch (item.id) {
      case 'save':
        this.store.dispatch(FoldersActions.followFolder({ uuid: folder.uuid }));
        break;
      case 'remove':
        this.store.dispatch(FoldersActions.unfollowFolder({ uuid: folder.uuid }));
        break;
    }
  }

  displayName(folder: Folder): string {
    return this.foldersService.isFavoritesFolder(folder)
      ? this.foldersService.getFavoritesDisplayName()
      : folder.name;
  }

  getOwnerOfFolder(folder: Folder): string {
    if (folder.users && folder.users.length > 0 && folder.users[0].length > 0) {
      const owner = folder.users[0].find(user => user.userRole === 'owner');
      return owner ? owner.userId : 'Unknown';
    }
    return 'Unknown';
  }

}
