import { Routes } from '@angular/router';

export enum APP_ROUTES_ENUM {
  SEARCH = 'search',
  SEARCH_RESULTS = 'search-results',
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'search',
    pathMatch: 'full',
  },
  {
    path: 'search',
    loadChildren: () =>
      import('./modules/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: 'search-results',
    loadChildren: () => import('./modules/search-results-page/search-results-page.module').then(m => m.SearchResultsPageModule)
  }
];
