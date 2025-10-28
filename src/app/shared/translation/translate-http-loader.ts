import { HttpBackend } from '@angular/common/http';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

export function HttpLoaderFactory(handler: HttpBackend) {
  return new MultiTranslateHttpLoader(handler, [
    'i18n/languages/',
    'i18n/constants/',
    'i18n/codetables/',
    'i18n/shared/',
    'i18n/physical_locations/',
    'i18n/',
  ]);
}
