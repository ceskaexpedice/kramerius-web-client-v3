import {Component, inject} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectDocumentDetailPages,
} from '../../../../shared/state/document-detail/document-detail.selectors';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {DetailPageItemComponent} from '../detail-page-item/detail-page-item.component';

@Component({
  selector: 'app-detail-pages-grid',
  imports: [
    NgIf,
    AsyncPipe,
    NgForOf,
    DetailPageItemComponent,
  ],
  templateUrl: './detail-pages-grid.component.html',
  styleUrl: './detail-pages-grid.component.scss'
})
export class DetailPagesGridComponent {
  private store = inject(Store);

  pages$ = this.store.select(selectDocumentDetailPages);

}
