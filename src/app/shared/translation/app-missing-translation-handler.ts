import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { LANG_FALLBACK_CHAIN, DEFAULT_LANG_FALLBACK } from './translation-fallback-chain';

const FALLBACK_CHAIN = LANG_FALLBACK_CHAIN;
const DEFAULT_FALLBACK = DEFAULT_LANG_FALLBACK;

@Injectable()
export class AppMissingTranslationService extends MissingTranslationHandler {

	private fallbackTranslations: Record<string, Record<string, any>> = {};
	private handlingKey: Set<string> = new Set();

	constructor() {
		super();
		// Earlier versions recorded every missing key in localStorage for every
		// visitor; drop that leftover entry.
		try {
			window.localStorage.removeItem('missingTranslations');
		} catch {
			// Storage unavailable (privacy mode, blocked site data): nothing to clean.
		}
	}

	setFallbackTranslations(lang: string, translations: Record<string, any>) {
		this.fallbackTranslations[lang] = translations;
	}

	handle(params: MissingTranslationHandlerParams): any {
		const key = params.key;

		// Prevent infinite recursion
		if (this.handlingKey.has(key)) {
			return key;
		}

		const translateService = params.translateService;
		const currentLang = translateService.getCurrentLang() ?? '';
		const fallbacks = FALLBACK_CHAIN[currentLang] ?? DEFAULT_FALLBACK;

		this.handlingKey.add(key);
		try {
			for (const fallbackLang of fallbacks) {
				const translations = this.fallbackTranslations[fallbackLang];
				if (translations) {
					const value = this.resolveNestedKey(translations, key);
					if (value !== undefined && value !== null && typeof value === 'string') {
						return value;
					}
				}
			}
		} finally {
			this.handlingKey.delete(key);
		}

		return key;
	}

	/**
	 * Bundles are flat with dots inside key names ("error.not_found.go_home"),
	 * so the key is looked up as-is first; nested lookup covers nested bundles.
	 */
	private resolveNestedKey(obj: any, key: string): any {
		if (obj && Object.prototype.hasOwnProperty.call(obj, key)) {
			return obj[key];
		}
		return key.split('.').reduce((acc, part) => acc?.[part], obj);
	}
}
