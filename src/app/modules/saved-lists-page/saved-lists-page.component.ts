import {Component, signal, OnInit} from '@angular/core';
import {Store} from '@ngrx/store';
import {AppResultsViewType} from '../settings/settings.model';
import * as FoldersActions from './state/folders.actions';

@Component({
  selector: 'app-saved-lists-page',
  standalone: false,
  templateUrl: './saved-lists-page.component.html',
  styleUrl: './saved-lists-page.component.scss'
})
export class SavedListsPageComponent implements OnInit {

  viewOptions = [
    { value: AppResultsViewType.grid, icon: 'icon-element-3' },
    { value: AppResultsViewType.list, icon: 'icon-row-vertical' }
  ];

  view = signal<AppResultsViewType>(AppResultsViewType.grid);

  constructor(private store: Store) {}

  ngOnInit() {
    // Folder loading is now handled automatically by the handleFoldersLoaded$ effect
    // when folders are successfully loaded from the app initialization
  }

  setView(view: AppResultsViewType) {
    this.view.set(view);
    // update the URL with the new view type
    const url = new URL(window.location.href);
    url.searchParams.set('viewType', view);
    window.history.replaceState({}, '', url.toString());
  }
}
