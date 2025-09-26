import { AppComponent } from './app.component';
import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { routes } from './app.routes';
import {
  MissingTranslationHandler,
  TranslateLoader,
  TranslateModule, TranslateParser,
  TranslateService,
} from '@ngx-translate/core';
import {HttpBackend, provideHttpClient, withFetch, withInterceptors} from '@angular/common/http';
import { ENVIRONMENT } from './app.config';
import { HeaderComponent } from './core/layout/header/header.component';
import { PercentageSignTranslateParser } from './shared/translation/percentage-sign-translate-parser';
import { AppMissingTranslationService } from './shared/translation/app-missing-translation-handler';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { StoreDevtoolsModule } from '@ngrx/store-devtools';
import { FooterComponent } from './core/layout/footer/footer.component';
import { routerReducer, StoreRouterConnectingModule } from '@ngrx/router-store';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpLoaderFactory } from './shared/translation/translate-http-loader';
import { EnvironmentService } from './shared/services/environment.service';
import {PlaybackBarComponent} from './shared/components/playback-bar/playback-bar.component';
import {LoadingOverlayComponent} from './shared/components/loading-overlay/loading-overlay.component';
import {FILTER_SERVICE} from './shared/services/filter.service';
import {SearchService} from './shared/services/search.service';
import { authReducer, authFeatureKey } from './core/auth/store';
import { AuthEffects } from './core/auth/store';
import {tokenInterceptor} from './core/auth/token.interceptor';
import {simpleCacheInterceptor} from './core/cache/simple-cache.interceptor-fn';

// NgRx Feature Reducers
import { periodicalsReducer } from './modules/search/state/periodicals/periodicals.reducer';
import { booksReducer } from './modules/search/state/books/books.reducer';
import { genresReducer } from './modules/search/state/genres/genres.reducer';
import { documentTypesReducer } from './modules/search/state/document-types/document-types.reducer';
import { searchReducer } from './modules/search-results-page/state/search.reducer';
import { musicDetailReducer } from './modules/music/state/music-detail.reducer';
import { documentDetailReducer } from './shared/state/document-detail/document-detail.reducer';
import { periodicalDetailReducer } from './modules/periodical/state/periodical-detail/periodical-detail.reducer';
import { periodicalSearchReducer } from './modules/periodical/state/periodical-search/periodical-search.reducer';
import { foldersReducer } from './modules/saved-lists-page/state/folders.reducer';
import { collectionsReducer } from './shared/state/collections/collections.reducer';

// NgRx Feature Effects
import { PeriodicalsEffects } from './modules/search/state/periodicals/periodicals.effects';
import { BooksEffects } from './modules/search/state/books/books.effects';
import { GenresEffects } from './modules/search/state/genres/genres.effects';
import { DocumentTypesEffects } from './modules/search/state/document-types/document-types.effects';
import { SearchEffects } from './modules/search-results-page/state/search.effects';
import { DocumentDetailEffects } from './shared/state/document-detail/document-detail.effects';
import { PeriodicalDetailEffects } from './modules/periodical/state/periodical-detail/periodical-detail.effects';
import { PeriodicalSearchEffects } from './modules/periodical/state/periodical-search/periodical-search.effects';
import { MusicDetailEffects } from './modules/music/state/music-detail.effects';
import { FoldersEffects } from './modules/saved-lists-page/state/folders.effects';
import { CollectionsEffects } from './shared/state/collections/collections.effects';

export function initApp(envService: EnvironmentService) {
  return () => envService.load();
}

@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    RouterModule.forRoot(routes),
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: HttpLoaderFactory,
        deps: [HttpBackend],
      },
      parser: {
        provide: TranslateParser,
        useClass: PercentageSignTranslateParser,
      },
      missingTranslationHandler: {
        provide: MissingTranslationHandler,
        useExisting: AppMissingTranslationService,
      },
    }),
    StoreModule.forRoot({
      router: routerReducer,
      [authFeatureKey]: authReducer,
      // Feature states moved to root to avoid warnings with root services
      periodicals: periodicalsReducer,
      books: booksReducer,
      genres: genresReducer,
      'document-types': documentTypesReducer,
      'search-results': searchReducer,
      music: musicDetailReducer,
      'document-detail': documentDetailReducer,
      'periodical-detail': periodicalDetailReducer,
      'periodical-search': periodicalSearchReducer,
      folders: foldersReducer,
      collections: collectionsReducer,
    }, {}),
    EffectsModule.forRoot([
      AuthEffects,
      // Feature effects moved to root to avoid warnings with root services
      PeriodicalsEffects,
      BooksEffects,
      GenresEffects,
      DocumentTypesEffects,
      SearchEffects,
      DocumentDetailEffects,
      PeriodicalDetailEffects,
      PeriodicalSearchEffects,
      MusicDetailEffects,
      FoldersEffects,
      CollectionsEffects,
    ]),
    StoreRouterConnectingModule.forRoot(),
    StoreDevtoolsModule.instrument({maxAge: 25, logOnly: ENVIRONMENT.production}),
    HeaderComponent,
    FooterComponent,
    PlaybackBarComponent,
    LoadingOverlayComponent,
  ],
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([simpleCacheInterceptor, tokenInterceptor])
    ),
    AppMissingTranslationService,
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [EnvironmentService],
      multi: true
    },
    {
      provide: FILTER_SERVICE,
      useExisting: SearchService
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
  constructor(translate: TranslateService) {
    translate.setDefaultLang(ENVIRONMENT.defaultLanguage);
  }
}
