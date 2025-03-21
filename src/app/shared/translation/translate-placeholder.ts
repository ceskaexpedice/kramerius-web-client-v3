import { TranslateService } from '@ngx-translate/core';

export function _(input: string, translateRightNow = true) {
	if (!input) {
		return '';
	}
	if (translateRightNow && translate) {
		return translate.instant(input);
	}
	return input;
}

export function getTranslatedText(input: string) {
	if (!input) {
		return '';
	}
	if (translate) {
		return translate.instant(input);
	}
	return input;
}

let translate: TranslateService;


/**
 * Call this function as soon as possible in your app to "inject"
 * ngx-translate's TranslateService to the _() function.
 *
 * Then you can use _('some text') in your .ts files. The text
 * wrapped in _() function will be extractable by ngx-translate-extract
 * and also automatically translated (unless false is given in second arg)
 *
 * Using _() function assume the translations are already loaded, so it is safe to
 * call instant() method for synchronous translation
 *
 * @param translateService
 */
export function initTranslatePlaceholderFunction(translateService: TranslateService) {
	if (translate) {
		throw new Error('Translate placeholder function already registered!');
	}
	translate = translateService;
}
