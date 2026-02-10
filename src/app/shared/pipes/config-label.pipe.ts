import { Pipe, PipeTransform, inject } from '@angular/core';
import { ConfigService } from '../../core/config/config.service';
import { AppTranslationService } from '../translation/app-translation.service';

/**
 * Pipe to get localized labels from config files.
 * Usage: {{ 'public' | configLabel:'license' }}
 *
 * Supports types: 'license' (more can be added)
 */
@Pipe({
  name: 'configLabel',
  standalone: true,
  pure: false // Needs to update when language changes
})
export class ConfigLabelPipe implements PipeTransform {
  private configService = inject(ConfigService);
  private translationService = inject(AppTranslationService);

  transform(key: string, type: 'license'): string {
    const currentLang = this.translationService.currentLanguage().code;
    return this.configService.getLocalizedLabel(type, key, currentLang);
  }
}
