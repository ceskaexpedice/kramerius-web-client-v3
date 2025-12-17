import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNumber'
})
export class FormatNumberPipe implements PipeTransform {

  //     return this.totalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  transform(value: unknown, ...args: unknown[]): unknown {
    if (typeof value !== 'number') {
      return value; // Return the original value if it's not a number
    }

    // Format the number with space as thousands separator
    return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

}
