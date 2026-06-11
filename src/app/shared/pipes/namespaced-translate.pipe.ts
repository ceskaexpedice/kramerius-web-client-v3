import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { AppTranslationService } from '../translation/app-translation.service';
import { resolveNamespacedTranslation } from '../translation/namespaced-translation';

/**
 * Translates a raw data value within a dedicated translation namespace, so that
 * short/ambiguous codes (e.g. a language code "d") cannot collide with unrelated
 * keys in the global translation namespace.
 *
 * It builds the key `{namespace}-{value}` and translates it. When that key has no
 * translation, the raw value is returned instead of leaking the prefixed key.
 *
 * Reusable for any namespaced facet/code: languages, institutions, locations, ...
 *
 * Usage: {{ 'slo' | namespacedTranslate:'language' }}  -> "Slovak"
 *        {{ 'd'   | namespacedTranslate:'language' }}  -> "d" (no entry, raw fallback)
 *        {{ code  | namespacedTranslate:'institution' }}
 */
@Pipe({
  name: 'namespacedTranslate',
  standalone: true,
  pure: false, // Needs to update when language changes
})
export class NamespacedTranslatePipe implements PipeTransform {
  private translate = inject(TranslateService);
  // Injected so the pipe re-evaluates reactively when the language changes.
  private translationService = inject(AppTranslationService);

  transform(value: string | null | undefined, namespace: string): string {
    if (value === null || value === undefined || value === '') return '';
    // Touch the current language so the pure-false pipe recomputes on switch.
    this.translationService.currentLanguage();

    return resolveNamespacedTranslation(this.translate, value, namespace);
  }
}
