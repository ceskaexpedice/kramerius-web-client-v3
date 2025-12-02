import { inject, Injectable, signal, Signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ENVIRONMENT } from '../../app.config';
import { Language } from './lang-picker/language';

@Injectable({
  providedIn: 'root'
})
export class AppTranslationService {
  private translate = inject(TranslateService);

  private availableLanguageCodes = ENVIRONMENT.availableLanguages;
  private defaultLanguageCode = ENVIRONMENT.defaultLanguage;

  private languagesMap: Language[] = this.availableLanguageCodes.map((code: string) => ({
    code,
    name: this.languageName(code),
    icon: `img/flags/flag_${code}.png`,
  }));

  private _currentLanguage = signal<Language>(this.detectInitialLanguage());

  constructor() {
    this.translate.setDefaultLang(ENVIRONMENT.fallbackLanguage);
    this.translate.use(this._currentLanguage().code);
  }

  get currentLanguage(): Signal<Language> {
    return this._currentLanguage;
  }

  get languages(): Language[] {
    return this.languagesMap;
  }

  switchLanguage(langCode: string): void {
    if (
      langCode === this._currentLanguage().code ||
      !this.availableLanguageCodes.includes(langCode)
    ) return;

    const selectedLang = this.languagesMap.find(l => l.code === langCode);
    if (!selectedLang) return;

    this._currentLanguage.set(selectedLang);
    localStorage.setItem('language', langCode);
    this.translate.use(langCode);
  }

  private detectInitialLanguage(): Language {
    const storedCode = localStorage.getItem('language');
    const detectedCode =
      storedCode && this.availableLanguageCodes.includes(storedCode)
        ? storedCode
        : this.detectFromBrowser() || this.defaultLanguageCode;

    return this.languagesMap.find(l => l.code === detectedCode) || this.languagesMap[0];
  }

  private detectFromBrowser(): string | null {
    const browserLangs = navigator.languages || [navigator.language];
    for (const lang of browserLangs) {
      const simplified = lang.slice(0, 2);
      if (this.availableLanguageCodes.includes(simplified)) return simplified;
    }
    return null;
  }

  private languageName(code: string): string {
    switch (code) {
      case 'cs': return 'Čeština';
      case 'en': return 'English';
      case 'sk': return 'Slovenčina';
      case 'pl': return 'Polski';
      default: return code;
    }
  }
}
