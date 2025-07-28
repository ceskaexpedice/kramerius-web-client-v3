import {Component, inject, Input} from '@angular/core';
import {SearchDocument} from '../../../modules/models/search-document';
import {NgClass, NgIf} from '@angular/common';
import {TranslatePipe} from '@ngx-translate/core';
import {Router} from '@angular/router';
import {RecordHandlerService} from '../../services/record-handler.service';
import {DocumentTypeEnum} from '../../../modules/constants/document-type';
import {SolrService} from '../../../core/solr/solr.service';
import {DocumentAccessibilityEnum} from '../../../modules/constants/document-accessibility';
import {AccessibilityBadgeComponent} from '../accessibility-badge/accessibility-badge.component';

@Component({
  selector: 'app-record-item',
  imports: [
    NgIf,
    TranslatePipe,
    AccessibilityBadgeComponent,
    NgClass,
  ],
  templateUrl: './record-item.component.html',
  styleUrl: './record-item.component.scss'
})
export class RecordItemComponent {

  recordHandler = inject(RecordHandlerService);
  solrService = inject(SolrService);

  @Input() record: SearchDocument = {} as SearchDocument;

  router = inject(Router);

  onRecordClick(e: Event, record: SearchDocument): void {
    e.stopPropagation();
    // redirect to detail view with ?uuid=record.uuId
    this.recordHandler.handleDocumentClick(record)
  }

  getImageThumbnailUrl(): string {
    return this.solrService.getImageThumbnailUrl(this.record.pid);
  }

  getTitle(): string {
    switch (this.record.model) {
      case DocumentTypeEnum.monograph:
        return this.record.title || '';
      case DocumentTypeEnum.periodical:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.periodicalvolume:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.article:
        return this.record.title || '';
      case DocumentTypeEnum.supplement:
        return this.record.title || '';
      case DocumentTypeEnum.page:
        return this.record.rootTitle || '';
      default:
        return this.record.rootTitle || '';
    }
  }

  getSubtitle() {
    switch (this.record.model) {
      case DocumentTypeEnum.article:
        return this.record.rootTitle || '';
      case DocumentTypeEnum.supplement:
        return this.record.rootTitle || '';
      default:
        return '';
    }
  }

  protected readonly DocumentTypeEnum = DocumentTypeEnum;
}
