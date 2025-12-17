import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { authCallbackGuard } from './core/auth/auth-callback.guard';

export enum APP_ROUTES_ENUM {
  SEARCH = '',
  SEARCH_RESULTS = 'search',
  DETAIL_VIEW = 'view',
  PERIODICAL_VIEW = 'periodical',
  MUSIC_VIEW = 'music',
  MONOGRAPH_VIEW = 'monograph',
  AUTH_CALLBACK = 'auth/callback',
  SAVED_LISTS = 'folders',
  PROFILE = 'profile',
  HELP = 'help',
  UUID_REDIRECT = 'uuid',
  COLLECTION = 'collection',
  DEV_TOOLS = 'devtools',
  NOT_FOUND = '404',
  SERVER_ERROR = '500',
}

export const routes: Routes = [
  {
    path: '',
    redirectTo: APP_ROUTES_ENUM.SEARCH,
    pathMatch: 'full',
  },
  {
    path: APP_ROUTES_ENUM.AUTH_CALLBACK,
    loadComponent: () => import('./core/auth/auth-callback/auth-callback.component').then(c => c.AuthCallbackComponent),
    canActivate: [authCallbackGuard]
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
  },
  {
    path: `${APP_ROUTES_ENUM.MONOGRAPH_VIEW}/:uuid`,
    loadComponent: () => import('./modules/monograph-volumes-page/monograph-volumes-page.component').then(c => c.MonographVolumesPageComponent)
  },
  {
    path: APP_ROUTES_ENUM.SAVED_LISTS,
    loadChildren: () => import('./modules/saved-lists-page/saved-lists-page.module').then(m => m.SavedListsPageModule),
    canActivate: [AuthGuard]
  },
  {
    path: APP_ROUTES_ENUM.COLLECTION,
    loadChildren: () => import('./modules/collections/collections-page.module').then(m => m.CollectionsPageModule),
    data: { breadcrumb: false } // Will be set dynamically with collection name
  },
  {
    path: APP_ROUTES_ENUM.DEV_TOOLS,
    loadComponent: () => import('./core/pages/dev-tools/dev-tools.component').then(c => c.DevToolsComponent)
  },
  {
    path: `${APP_ROUTES_ENUM.UUID_REDIRECT}/:uuid`,
    loadComponent: () => import('./shared/components/uuid-redirect/uuid-redirect.component').then(c => c.UuidRedirectComponent)
  },
  {
    path: APP_ROUTES_ENUM.NOT_FOUND,
    loadComponent: () => import('./core/pages/not-found/not-found.component').then(c => c.NotFoundComponent)
  },
  {
    path: APP_ROUTES_ENUM.SERVER_ERROR,
    loadComponent: () => import('./core/pages/server-error/server-error.component').then(c => c.ServerErrorComponent)
  },
  {
    path: '**',
    redirectTo: APP_ROUTES_ENUM.NOT_FOUND
  }
];
