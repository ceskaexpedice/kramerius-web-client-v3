import {InterpolateFunction, TranslateDefaultParser, InterpolationParameters} from '@ngx-translate/core';

/**
 * Enables using placeholder using %placeholder% syntax instead of {{ placeholder }}
 * Useful when keys are also viewable texts and {{ }} syntax would mess up with angular template syntax
 *
 * In template:
 *
 * <div translate [translateParams]="{who: 'world'}">Hello %who%</div>
 * <div>{{ 'Hello %who%' | translate:{who: 'world'} }}</div>
 *
 * With original {{ }} syntax, this would reult in an error
 * <div translate [translateParams]="{who: 'world'}">Hello {{ who }}</div>
 * <div>{{ 'Hello {{ who }}' | translate:{who: 'world'} }}</div>
 *
 *
 * Usage - in NgModule definition when configuring imported TranslateModule:
 *
 * 		TranslateModule.forRoot({
 *			// loaders, missing translation handlers, etc
 *			parser: {
 *				provide: TranslateParser,
 *				useClass: PercentageSignTranslateParser,
 *			},
 *		}),
 *
 */
export class PercentageSignTranslateParser extends TranslateDefaultParser {

	protected regexp = new RegExp(/%\s?([a-z0-9\-_]+)\s?%/, 'ig');

  override interpolate(expr: string | InterpolateFunction, params?: InterpolationParameters): string | undefined {
    if (typeof expr === 'string') {
      return super.interpolate(
        expr.replace(
          this.regexp,
          (all, innerPart) => `{{ ${innerPart} }}`
        ),
        params
      );
    }
    return super.interpolate(expr, params);
  }

}
