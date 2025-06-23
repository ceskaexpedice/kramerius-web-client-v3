import { Component, Input } from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-paginator-info',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './paginator-info.component.html',
  styleUrl: './paginator-info.component.scss',
  standalone: true
})
export class PaginatorInfoComponent {
  @Input() page: number = 1;
  @Input() pageSize: number = 10;
  @Input() totalCount: number = 0;

  get start(): number {
    return this.totalCount === 0 ? 0 : (this.page - 1) * this.pageSize + 1;
  }

  get end(): number {
    return Math.min(this.page * this.pageSize, this.totalCount);
  }

  get formattedTotalCount(): string {
    // format total count with space as thousands separator
    return this.totalCount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  }

}
