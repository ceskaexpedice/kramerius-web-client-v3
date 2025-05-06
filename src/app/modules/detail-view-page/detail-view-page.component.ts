import { Component } from '@angular/core';
import {loadDocumentDetail} from '../../state/document-detail/document-detail.actions';
import {Store} from '@ngrx/store';
import {
  selectDocumentDetail,
  selectDocumentDetailError,
  selectDocumentDetailLoading,
} from '../../state/document-detail/document-detail.selectors';

@Component({
  selector: 'app-detail-view-page',
  templateUrl: './detail-view-page.component.html',
  styleUrl: './detail-view-page.component.scss',
  standalone: false
})
export class DetailViewPageComponent {
  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);

  constructor(
    private store: Store
  ) {}

  ngOnInit() {
    this.store.dispatch(loadDocumentDetail());
  }

}
