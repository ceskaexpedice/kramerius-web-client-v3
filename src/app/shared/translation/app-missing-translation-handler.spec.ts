import { MissingTranslationHandlerParams } from '@ngx-translate/core';
import { AppMissingTranslationService } from './app-missing-translation-handler';

describe('AppMissingTranslationService', () => {

  function params(key: string, lang: string): MissingTranslationHandlerParams {
    return {
      key,
      translateService: { getCurrentLang: () => lang },
    } as unknown as MissingTranslationHandlerParams;
  }

  it('falls back to a flat key whose name contains dots', () => {
    const handler = new AppMissingTranslationService();
    handler.setFallbackTranslations('cs', { 'error.not_found.go_home': 'Zpět na hlavní stránku' });

    expect(handler.handle(params('error.not_found.go_home', 'sk'))).toBe('Zpět na hlavní stránku');
  });

  it('still resolves nested keys', () => {
    const handler = new AppMissingTranslationService();
    handler.setFallbackTranslations('en', { section: { title: 'Title' } });

    expect(handler.handle(params('section.title', 'cs'))).toBe('Title');
  });

  it('returns the key when no fallback has it, without writing to localStorage', () => {
    const setItem = spyOn(window.localStorage, 'setItem');
    const handler = new AppMissingTranslationService();

    expect(handler.handle(params('nowhere.to.be.found', 'sk'))).toBe('nowhere.to.be.found');
    expect(setItem).not.toHaveBeenCalled();
  });
});
