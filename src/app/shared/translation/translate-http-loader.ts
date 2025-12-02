import { HttpBackend } from '@angular/common/http';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';
import { ENVIRONMENT } from '../../app.config';

export function HttpLoaderFactory(handler: HttpBackend) {
  const suffix = `.json?v=${ENVIRONMENT.translationVersion}`;

  return new MultiTranslateHttpLoader(handler, [
    { prefix: 'i18n/languages/', suffix },
    { prefix: 'i18n/relators/', suffix },
    { prefix: 'i18n/constants/', suffix },
    { prefix: 'i18n/codetables/', suffix },
    { prefix: 'i18n/shared/', suffix },
    { prefix: 'i18n/physical_locations/', suffix },
    { prefix: 'i18n/', suffix },
  ]);
}
