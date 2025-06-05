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
import { HttpBackend, provideHttpClient } from '@angular/common/http';
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
      router: routerReducer
    }, {}),
    EffectsModule.forRoot([]),
    StoreRouterConnectingModule.forRoot(),
    StoreDevtoolsModule.instrument({ maxAge: 25, logOnly: ENVIRONMENT.production }),
    HeaderComponent,
    FooterComponent,
  ],
  providers: [
    provideHttpClient(),
    AppMissingTranslationService,
    {
      provide: APP_INITIALIZER,
      useFactory: initApp,
      deps: [EnvironmentService],
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})

export class AppModule {
  constructor(translate: TranslateService) {
    translate.setDefaultLang(ENVIRONMENT.defaultLanguage);
  }
}
