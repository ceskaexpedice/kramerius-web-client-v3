import { Routes } from '@angular/router';

export enum APP_ROUTES_ENUM {
  SEARCH = 'search',
  SEARCH_RESULTS = 'search-results',
  DETAIL_VIEW = 'view',
  PERIODICAL_VIEW = 'periodical',
  MUSIC_VIEW = 'music',
  AUTH_CALLBACK = 'auth/callback'
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: APP_ROUTES_ENUM.SEARCH,
    pathMatch: 'full',
  },
  {
    path: APP_ROUTES_ENUM.AUTH_CALLBACK,
    loadComponent: () => import('./core/auth/auth-callback/auth-callback.component').then(c => c.AuthCallbackComponent)
  },
  {
    path: APP_ROUTES_ENUM.SEARCH,
    loadChildren: () =>
      import('./modules/search/search.module').then(m => m.SearchPageModule)
  },
  {
    path: APP_ROUTES_ENUM.SEARCH_RESULTS,
    loadChildren: () => import('./modules/search-results-page/search-results-page.module').then(m => m.SearchResultsPageModule)
  },
  {
    path: APP_ROUTES_ENUM.DETAIL_VIEW,
    loadChildren: () => import('./modules/detail-view-page/detail-view-page.module').then(m => m.DetailViewPageModule)
  },
  {
    path: APP_ROUTES_ENUM.PERIODICAL_VIEW,
    loadChildren: () => import('./modules/periodical/periodical-page.module').then(m => m.PeriodicalPageModule)
  },
  {
    path: APP_ROUTES_ENUM.MUSIC_VIEW,
    loadChildren: () => import('./modules/music/music-page.module').then(m => m.MusicPageModule)
  }
];
