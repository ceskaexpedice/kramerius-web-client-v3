import { isDevMode } from '@angular/core';
import { HttpBackend, HttpClient } from '@angular/common/http';
import { TranslateLoader, TranslationObject } from '@ngx-translate/core';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
import { Observable, catchError, shareReplay, throwError } from 'rxjs';
import { ENVIRONMENT } from '../../app.config';

/**
 * Translation namespaces, merged in this order (later wins). '' is the root
 * `i18n/<lang>.json`. Keep in sync with NAMESPACES in scripts/bundle-i18n.js,
 * which pre-merges them into `i18n/bundle/<lang>.json` for production builds.
 */
const I18N_NAMESPACES = [
  'relators',
  'languages',
  'constants',
  'codetables',
  'shared',
  'physical_locations',
  'source',
  'access_denied',
  '',
];

/**
 * Production: one pre-merged file per language (`i18n/bundle/<lang>.json`,
 * written by scripts/bundle-i18n.js after `npm run build`) instead of nine.
 * If the bundle is missing — e.g. a build run without the npm postbuild step —
 * it falls back to loading the individual namespace files.
 */
class BundledTranslateLoader implements TranslateLoader {
  constructor(
    private readonly http: HttpClient,
    private readonly suffix: string,
    private readonly fallback: TranslateLoader,
  ) {}

  getTranslation(lang: string): Observable<TranslationObject> {
    return this.http.get<TranslationObject>(`i18n/bundle/${lang}${this.suffix}`).pipe(
      catchError(() => this.fallback.getTranslation(lang)),
    );
  }
}

/**
 * Loads each language at most once and shares the result between every
 * consumer. ngx-translate dedupes its own requests, but AppTranslationService
 * also preloads the fallback chain (e.g. 'en' for 'cs') for the missing-key
 * handler through this factory — without sharing, the fallback language was
 * downloaded twice on every startup.
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
  const perNamespace = new MultiTranslateHttpLoader(
    handler,
    I18N_NAMESPACES.map(ns => ({ prefix: ns ? `i18n/${ns}/` : 'i18n/', suffix })),
  );
  // `ng serve` (dev mode) always reads the source files, so edits to the
  // translations show up without rebuilding the bundle.
  const loader = isDevMode()
    ? perNamespace
    : new BundledTranslateLoader(new HttpClient(handler), suffix, perNamespace);

  sharedLoader = new SharedTranslateLoader(loader);
  return sharedLoader;
}
