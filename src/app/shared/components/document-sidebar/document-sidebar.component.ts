import { Component, inject, Input } from '@angular/core';
import { NgIf } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { InputComponent } from '../input/input.component';
import { PageNavigatorComponent } from '../page-navigator/page-navigator.component';
import { AdminActionsComponent } from '../admin-actions/admin-actions.component';
import { DetailPagesGridComponent } from '../../../modules/detail-view-page/components/detail-pages-grid/detail-pages-grid.component';
import { DetailViewService } from '../../../modules/detail-view-page/services/detail-view.service';
import { DocumentTypeEnum } from '../../../modules/constants/document-type';
import { Metadata } from '../../models/metadata.model';
import {SelectionService} from '../../services';

@Component({
  selector: 'app-document-sidebar',
  imports: [
    NgIf,
    TranslateModule,
    InputComponent,
    PageNavigatorComponent,
    AdminActionsComponent,
    DetailPagesGridComponent
  ],
  templateUrl: './document-sidebar.component.html',
  styleUrl: './document-sidebar.component.scss'
})
export class DocumentSidebarComponent {
  @Input() document!: Metadata;

  public detailViewService = inject(DetailViewService);
  public selectionService = inject(SelectionService);

  protected readonly DocumentTypeEnum = DocumentTypeEnum;

  get isSoundRecording(): boolean {
    return this.document?.model === DocumentTypeEnum.soundrecording;
  }

  get shouldShowPageNavigator(): boolean {
    if (this.isSoundRecording) {
      return this.detailViewService.soundRecordingViewMode() === 'images';
    }
    return true;
  }

  get gridType(): 'recording' | 'page' {
    return this.isSoundRecording ? 'recording' : 'page';
  }
}
