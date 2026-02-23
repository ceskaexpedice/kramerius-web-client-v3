import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { Injectable } from '@angular/core';
import { LANG_FALLBACK_CHAIN, DEFAULT_LANG_FALLBACK } from './translation-fallback-chain';

const FALLBACK_CHAIN = LANG_FALLBACK_CHAIN;
const DEFAULT_FALLBACK = DEFAULT_LANG_FALLBACK;

@Injectable()
export class AppMissingTranslationService extends MissingTranslationHandler {

	protected missingKeys: {[key: string]: boolean} = {};
	private fallbackTranslations: Record<string, Record<string, any>> = {};
	private handlingKey: Set<string> = new Set();

	constructor() {
		super();
		this.load();
	}

	getMissingKeys() {
		return this.missingKeys;
	}

	setFallbackTranslations(lang: string, translations: Record<string, any>) {
		this.fallbackTranslations[lang] = translations;
	}

	protected save() {
		window.localStorage.setItem('missingTranslations', JSON.stringify(Object.keys(this.missingKeys)));
	}

	protected load() {
		let loaded = window.localStorage.getItem('missingTranslations');
		if (loaded) {
			let parsed = JSON.parse(loaded);
			if (parsed && parsed.length && parsed.map) {
				parsed.map(
					(key: string) => {
						this.missingKeys[key] = true;
					}
				);
			}
		}
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

		this.missingKeys[key] = true;
		this.save();
		return key;
	}

	private resolveNestedKey(obj: any, key: string): any {
		return key.split('.').reduce((acc, part) => acc?.[part], obj);
	}
}
