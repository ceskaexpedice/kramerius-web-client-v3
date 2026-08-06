import { Pipe, PipeTransform } from '@angular/core';
import { linkifyText } from '../utils/linkify';

/**
 * Turns bare URLs and e-mail addresses in plain text into anchors. The result
 * is meant for [innerHTML]; the input is fully escaped by `linkifyText`.
 */
@Pipe({
  name: 'linkify',
  standalone: true
})
export class LinkifyPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    return text ? linkifyText(text) : '';
  }
}
