import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

@Pipe({
  name: 'pluralize',
  standalone: true
})
export class PluralizePipe implements PipeTransform {
  private translateService = inject(TranslateService);

  transform(count: number, translationKey: string): string {
    const currentLang = this.translateService.currentLang || 'sk';
    const pluralForm = this.getPluralForm(count, currentLang);
    const key = `${translationKey}.${pluralForm}`;

    const translation = this.translateService.instant(key);
    return `${count} ${translation}`;
  }

  private getPluralForm(count: number, lang: string): string {
    // Handle Czech and Slovak pluralization
    if (lang === 'cs' || lang === 'sk') {
      if (count === 1) {
        return 'one';
      } else if (count >= 2 && count <= 4) {
        return 'few';
      } else {
        return 'many';
      }
    }

    // Handle Polish pluralization
    if (lang === 'pl') {
      if (count === 1) {
        return 'one';
      } else if (count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20)) {
        return 'few';
      } else {
        return 'many';
      }
    }

    // Handle English and other languages using same structure
    if (count === 1) {
      return 'one';
    } else {
      return 'many';
    }
  }
}
