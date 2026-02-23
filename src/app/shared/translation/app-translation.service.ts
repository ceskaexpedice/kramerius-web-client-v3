import { inject, Injectable, signal, Signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ENVIRONMENT } from '../../app.config';
import { Language } from './lang-picker/language';
import { ConfigService } from '../../core/config';
import { AppMissingTranslationService } from './app-missing-translation-handler';
import { HttpBackend } from '@angular/common/http';
import { HttpLoaderFactory } from './translate-http-loader';
import { LANG_FALLBACK_CHAIN, DEFAULT_LANG_FALLBACK } from './translation-fallback-chain';

const FALLBACK_CHAIN = LANG_FALLBACK_CHAIN;
const DEFAULT_FALLBACK = DEFAULT_LANG_FALLBACK;

@Injectable({
  providedIn: 'root'
})
export class AppTranslationService {
  private translate = inject(TranslateService);
  private configService = inject(ConfigService);
  private missingHandler = inject(AppMissingTranslationService);
  private httpBackend = inject(HttpBackend);

  // Get language settings from ConfigService, fallback to ENVIRONMENT
  private get availableLanguageCodes(): string[] {
    return this.configService.i18n.supportedLanguages ?? ENVIRONMENT.availableLanguages;
  }

  private get defaultLanguageCode(): string {
    return this.configService.i18n.defaultLanguage ?? ENVIRONMENT.defaultLanguage;
  }

  private get fallbackLanguageCode(): string {
    return this.configService.i18n.fallbackLanguage ?? ENVIRONMENT.fallbackLanguage;
  }

  private get languagesMap(): Language[] {
    return this.availableLanguageCodes.map((code: string) => ({
      code,
      name: this.languageName(code),
      icon: `img/flag/${code}.svg`,
    }));
  }

  private _currentLanguage = signal<Language>(this.detectInitialLanguage());

  constructor() {
    this.translate.setDefaultLang(this.fallbackLanguageCode);
    this.translate.use(this._currentLanguage().code);
    this.preloadFallbackLanguages();
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
    this.preloadFallbackLanguages();
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

  private preloadFallbackLanguages(): void {
    const currentCode = this._currentLanguage().code;
    const fallbacks = FALLBACK_CHAIN[currentCode] ?? DEFAULT_FALLBACK;
    const loader = HttpLoaderFactory(this.httpBackend);

    for (const lang of fallbacks) {
      if (lang !== currentCode) {
        loader.getTranslation(lang).subscribe(translations => {
          this.missingHandler.setFallbackTranslations(lang, translations as Record<string, any>);
        });
      }
    }
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
