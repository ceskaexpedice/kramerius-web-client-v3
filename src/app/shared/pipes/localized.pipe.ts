import { Pipe, PipeTransform, inject } from '@angular/core';
import { LocalizedLabel } from '../../core/config/config.interfaces';
import { AppTranslationService } from '../translation/app-translation.service';
import { ConfigService } from '../../core/config/config.service';

/**
 * Pipe to resolve a LocalizedLabel object to the current language's string.
 * If the value is already a plain string it is returned as-is (backward compatible).
 * Uses ConfigService.resolveLabel() with the proper language fallback chain.
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
  private configService = inject(ConfigService);

  transform(value: string | LocalizedLabel | undefined, fallback = ''): string {
    const lang = this.translationService.currentLanguage().code;
    return this.configService.resolveLabel(value, lang, fallback);
  }
}
