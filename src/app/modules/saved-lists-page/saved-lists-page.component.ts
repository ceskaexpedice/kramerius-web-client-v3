import {Component, signal, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {ActivatedRoute} from '@angular/router';
import {AppResultsViewType} from '../settings/settings.model';
import * as FoldersActions from './state/folders.actions';
import {selectActiveFolderItems, selectAllFolders, selectFolderDetails, selectFolderSearchResults, selectFolderDetailsLoading} from './state';
import {first} from 'rxjs';

@Component({
  selector: 'app-saved-lists-page',
  standalone: false,
  templateUrl: './saved-lists-page.component.html',
  styleUrl: './saved-lists-page.component.scss'
})
export class SavedListsPageComponent implements OnInit {

  activeFolderItems = this.store.select(selectFolderSearchResults);
  activeFolder = this.store.select(selectFolderDetails);
  folders = this.store.select(selectAllFolders);

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-element-3' },
    { value: AppResultsViewType.list, icon: 'icon-row-vertical' }
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);

  constructor(private store: Store, private route: ActivatedRoute) {
  }

  ngOnInit() {
    // Check if we're on the base route without UUID
    const uuid = this.route.snapshot.paramMap.get('uuid');

    if (!uuid) {
      // Always dispatch loadFirstFolderOnInit - the effect will handle waiting for folders
      this.store.dispatch(FoldersActions.loadFirstFolderOnInit());
    } else {
      // Check if folder details are already loading or loaded
      this.store.select(selectFolderDetailsLoading).pipe(first()).subscribe(isLoading => {
        this.store.select(selectFolderDetails).pipe(first()).subscribe(folderDetails => {
          const isAlreadyLoadingThisFolder = isLoading;
          const isAlreadyLoadedThisFolder = folderDetails?.uuid === uuid;

          if (!isAlreadyLoadingThisFolder && !isAlreadyLoadedThisFolder) {
            // Load specific folder based on UUID only if not already loading/loaded
            this.store.dispatch(FoldersActions.loadFolderDetails({ uuid }));
          } else {
          }
        });
      });
    }
  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    // update the URL with the new view type
    const url = new URL(window.location.href);
    url.searchParams.set('viewType', view);
    window.history.replaceState({}, '', url.toString());
  }

  protected readonly ViewOptions = AppResultsViewType;
}
