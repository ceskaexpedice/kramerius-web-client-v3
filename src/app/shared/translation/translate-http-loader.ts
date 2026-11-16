import { HttpBackend } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { ENVIRONMENT } from '../../app.config';

/**
 * Loads each language at most once and shares the result between every
 * consumer. ngx-translate dedupes its own requests, but AppTranslationService
 * also preloads the fallback chain (e.g. 'en' for 'cs') for the missing-key
 * handler through this factory — without sharing, the fallback language's nine
 * JSON files were downloaded twice on every startup.
 */
class SharedTranslateLoader implements TranslateLoader {
  private readonly requests = new Map<string, Observable<TranslationObject>>();

  constructor(private readonly inner: TranslateLoader) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    let request = this.requests.get(lang);
    if (!request) {
      request = this.inner.getTranslation(lang).pipe(
        // A failed load must not stay cached: let the next caller retry.
        catchError(err => {
          this.requests.delete(lang);
          return throwError(() => err);
        }),
        shareReplay(1),
      );
      this.requests.set(lang, request);
    }
    return request;
  }
}

// One loader for the whole app (the ngx-translate provider and
// AppTranslationService's fallback preload both call the factory).
let sharedLoader: SharedTranslateLoader | null = null;

export function HttpLoaderFactory(handler: HttpBackend): TranslateLoader {
  if (sharedLoader) return sharedLoader;

  const suffix = `.json?v=${ENVIRONMENT.translationVersion}`;
  sharedLoader = new SharedTranslateLoader(new MultiTranslateHttpLoader(handler, [
    { prefix: 'i18n/relators/', suffix },
    { prefix: 'i18n/languages/', suffix },
    { prefix: 'i18n/constants/', suffix },
    { prefix: 'i18n/codetables/', suffix },
    { prefix: 'i18n/shared/', suffix },
    { prefix: 'i18n/physical_locations/', suffix },
    { prefix: 'i18n/source/', suffix },
    { prefix: 'i18n/access_denied/', suffix },
    { prefix: 'i18n/', suffix },
  ]));
  return sharedLoader;
}
