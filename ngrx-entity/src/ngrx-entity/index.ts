import {
  apply,
  mergeWith,
  move,
  template,
  url,
  Rule,
  chain,
  SchematicsException
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';

export function ngrxEntity(_options: any): Rule {
  if (!_options.name) {
    throw new SchematicsException('Musíš zadať názov entity.');
  }

  const templateSource = apply(url('./files'), [
    template({
      ..._options,
      ...strings
    }),
    move(`${_options.path}/${strings.dasherize(_options.name)}`),
  ]);

  return chain([
    mergeWith(templateSource)
  ]);
}
