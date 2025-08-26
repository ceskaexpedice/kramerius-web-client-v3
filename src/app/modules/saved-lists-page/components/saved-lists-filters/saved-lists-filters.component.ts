import {Component, inject, Input} from '@angular/core';
import {Router} from '@angular/router';
import {AutocompleteComponent} from '../../../../shared/components/autocomplete/autocomplete.component';
import {TranslatePipe} from '@ngx-translate/core';
import {
  CollapsibleCategoryComponent
} from '../../../../shared/components/collapsible-category/collapsible-category.component';
import {Folder, FolderDetails, selectAllFolders, selectUserFollowedFolders, selectUserOwnedFolders} from '../../state';
import * as FoldersActions from '../../state/folders.actions';
import {Store} from '@ngrx/store';
import {AsyncPipe} from '@angular/common';

@Component({
  selector: 'app-saved-lists-filters',
  standalone: true,
  styles: `
    .filter-section-title {
      font-size: 14px;
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
    AutocompleteComponent,
    TranslatePipe,
    CollapsibleCategoryComponent,
    AsyncPipe,
  ],
  template: `
    <div class="filters-content">

      <app-autocomplete
        [inputTheme]="'dark'"
        [placeholder]="'search-in-saved-list--placeholder' | translate"
        [size]="'sm'"
        [minTermLength]="2"
        [showHelpButton]="false"
        [showMicrophoneButton]="false"
        [showSubmitButton]="false"

        [showHistorySuggestions]="true"
      >
      </app-autocomplete>

<!--      (suggestionSelected)="periodicalService.onSuggestionSelected($event)"
     (search)="periodicalService.onSearch($event)"
        [inputTerm]="periodicalService.searchTerm"
                [initialValue]="periodicalService.inputSearchTerm"
        [getSuggestions]="periodicalService.getSuggestionsFn"
-->


      <hr>

      <app-collapsible-category
        [label]="'my-favorites-list--title' | translate"
        [labelIcon]="'icon-heart'"
        [showIndicator]="false"
        [initiallyExpanded]="true">

        @for (folder of folders | async; track folder.uuid) {
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

        @for (folder of followedFolders | async; track folder.uuid) {
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

  folders = this.store.select(selectUserOwnedFolders);
  followedFolders = this.store.select(selectUserFollowedFolders);

  changeFolder(folder: Folder) {
    console.log('📂 Changing to folder:', folder.name, folder.uuid);

    // Update the URL to the selected folder
    this.router.navigate(['/folders', folder.uuid]);

    // Select the folder and load its details
    this.store.dispatch(FoldersActions.selectFolder({ folder }));
    this.store.dispatch(FoldersActions.loadFolderDetails({ uuid: folder.uuid }));
  }

  getOwnerOfFolder(folder: Folder): string {
    if (folder.users && folder.users.length > 0 && folder.users[0].length > 0) {
      const owner = folder.users[0].find(user => user.userRole === 'owner');
      return owner ? owner.userId : 'Unknown';
    }
    return 'Unknown';
  }

}
