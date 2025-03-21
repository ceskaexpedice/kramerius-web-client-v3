import { MissingTranslationHandler, MissingTranslationHandlerParams } from '@ngx-translate/core';
import { Injectable } from '@angular/core';

@Injectable()
export class AppMissingTranslationService extends MissingTranslationHandler {

	protected missingKeys: {[key: string]: boolean} = {};

	constructor(
	) {
		super();
		this.load();
	}

	getMissingKeys() {
		return this.missingKeys;
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

		let key = params.key;
		this.missingKeys[key] = true;
		this.save();
		return key;

	}

}
