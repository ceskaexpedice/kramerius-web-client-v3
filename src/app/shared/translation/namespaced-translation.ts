import { TranslateService } from '@ngx-translate/core';

/**
 * Resolves a raw data value within a dedicated translation namespace, so that
 * short/ambiguous codes (e.g. a language code "d") cannot collide with unrelated
 * keys in the global translation namespace.
 *
 * Builds the key `{namespace}-{value}` and translates it. When that key has no
 * translation, the raw value is returned instead of leaking the prefixed key
 * (the missing-translation handler echoes the key back when it is absent).
 *
 * Shared by NamespacedTranslatePipe and components that translate option labels
 * internally (e.g. app-select). Reusable for any namespaced code: languages,
 * institutions, locations, ...
 */
export function resolveNamespacedTranslation(
  translate: TranslateService,
  value: string,
  namespace: string
): string {
  const key = `${namespace}-${value}`;
  const translated = translate.instant(key);
  return translated === key ? value : translated;
}
