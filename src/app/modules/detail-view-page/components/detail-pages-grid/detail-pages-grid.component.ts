import {Component, inject} from '@angular/core';
import {Store} from '@ngrx/store';
import {
  selectDocumentDetailPages,
} from '../../../../shared/state/document-detail/document-detail.selectors';
import {AsyncPipe, NgForOf, NgIf} from '@angular/common';
import {DetailPageItemComponent} from '../detail-page-item/detail-page-item.component';
import {DetailViewService} from '../../services/detail-view.service';

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
  public detailViewService = inject(DetailViewService);

  clickedPage(index: number) {
    console.log('Page clicked:', index);
    this.detailViewService.goToPage(index);
  }

}
