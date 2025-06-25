import { Component, inject } from '@angular/core';
import { loadDocumentDetail } from '../../shared/state/document-detail/document-detail.actions';
import { Store } from '@ngrx/store';
import {
  selectDocumentDetail,
  selectDocumentDetailError,
  selectDocumentDetailLoading,
} from '../../shared/state/document-detail/document-detail.selectors';
import { RecordInfoService } from '../../shared/services/record-info.service';
import { take } from 'rxjs';
import { DocumentDetail } from '../models/document-detail';
import { EnvironmentService } from '../../shared/services/environment.service';
import {DetailViewService} from './services/detail-view.service';

@Component({
  selector: 'app-detail-view-page',
  templateUrl: './detail-view-page.component.html',
  styleUrl: './detail-view-page.component.scss',
  standalone: false
})
export class DetailViewPageComponent {

  private store = inject(Store);
  private recordInfoService = inject(RecordInfoService);
  private krameriusBaseUrl: string;

  public detailViewService = inject(DetailViewService);

  document$ = this.store.select(selectDocumentDetail);
  loading$ = this.store.select(selectDocumentDetailLoading);
  error$ = this.store.select(selectDocumentDetailError);

  constructor(private envService: EnvironmentService) {
    this.krameriusBaseUrl = this.envService.get('krameriusBaseUrl');
  }

  ngOnInit() {
    this.store.dispatch(loadDocumentDetail());

    this.detailViewService.loadPages();
  }

  goBackClicked() {

  }

  openRecordInfo() {
    this.document$.pipe(take(1)).subscribe((doc: DocumentDetail | null) => {
      if (!doc) return;

      const uuid = doc?.pid;
      if (uuid) {
        this.recordInfoService.openRecordInfoDialog(uuid);
      }
    });
  }

  getKrameriusBaseUrl(): string {
    return this.krameriusBaseUrl;
  }

}
