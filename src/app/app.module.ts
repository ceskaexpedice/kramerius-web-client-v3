import {AppComponent} from './app.component';
import {NgModule} from '@angular/core';
import {BrowserModule} from '@angular/platform-browser';
import {RouterModule} from '@angular/router';
import {routes} from './app.routes';
import {
  MissingTranslationHandler,
  TranslateLoader,
  TranslateModule, TranslateParser,
  TranslateService,
} from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import {HttpClient, provideHttpClient} from '@angular/common/http';
import {ENVIRONMENT} from './app.config';
import {HeaderComponent} from './core/layout/header/header.component';
import {PercentageSignTranslateParser} from './shared/translation/percentage-sign-translate-parser';
import {AppMissingTranslationService} from './shared/translation/app-missing-translation-handler';
import {StoreModule} from '@ngrx/store';
import {EffectsModule} from '@ngrx/effects';
import {StoreDevtoolsModule} from '@ngrx/store-devtools';
import {FooterComponent} from './core/layout/footer/footer.component';
import {routerReducer, StoreRouterConnectingModule} from '@ngrx/router-store';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './i18n/', '.json');
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
        deps: [HttpClient],
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
      router: routerReducer
    }, {}),
    EffectsModule.forRoot([]),
    StoreRouterConnectingModule.forRoot(),
    StoreDevtoolsModule.instrument({maxAge: 25, logOnly: ENVIRONMENT.production}),
    HeaderComponent,
    FooterComponent,
  ],
  providers: [
    provideHttpClient(),
    AppMissingTranslationService
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
  constructor(translate: TranslateService) {
    translate.setDefaultLang(ENVIRONMENT.defaultLanguage);
  }
}
