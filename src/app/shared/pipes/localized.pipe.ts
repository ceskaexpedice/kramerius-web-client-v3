import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocalizedLabel } from '../../core/config/config.interfaces';
import { AppTranslationService } from '../translation/app-translation.service';

/**
 * Pipe to resolve a LocalizedLabel object to the current language's string.
 * If the value is already a plain string it is returned as-is (backward compatible).
 * Usage: {{ config.title | localized }}
 *        {{ config.buttonText | localized:'fallback text' }}
 */
@Pipe({
  name: 'localized',
  standalone: true,
  pure: false
})
export class LocalizedPipe implements PipeTransform {
  private translationService = inject(AppTranslationService);

  transform(value: string | LocalizedLabel | undefined, fallback = ''): string {
    if (!value) return fallback;
    if (typeof value === 'string') return value;
    const lang = this.translationService.currentLanguage().code;
    return value[lang] ?? value['en'] ?? value['cs'] ?? Object.values(value)[0] ?? fallback;
  }
}
