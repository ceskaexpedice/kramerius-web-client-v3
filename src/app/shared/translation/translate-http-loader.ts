import { HttpBackend } from '@angular/common/http';
import { MultiTranslateHttpLoader } from 'ngx-translate-multi-http-loader';

export function HttpLoaderFactory(handler: HttpBackend) {
  return new MultiTranslateHttpLoader(handler, [
    'i18n/',
    'i18n/constants/',
    'i18n/codetables/',
    'i18n/shared/',
  ]);
}
