import { Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShareService } from '../../services/share.service';
import { DocumentHierarchySelectorComponent, DocumentHierarchyItem } from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { RecordHandlerService } from '../../services/record-handler.service';
import { Metadata } from '../../models/metadata.model';
import { copyTextToClipboard } from '../../misc/misc-functions';
import { ToastService } from '../../services/toast.service';
import {SolrService} from '../../../core/solr/solr.service';

@Component({
  selector: 'app-share-dialog',
  imports: [
    TranslatePipe,
    DocumentHierarchySelectorComponent,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrls: ['./share-dialog.component.scss', '../generic-dialog.scss'],
})
export class ShareDialogComponent {
  document!: Metadata;
  selectedPid: string = '';
  selectedModel: string = '';
  currentShareUrl: string = '';
  queryParams: { [key: string]: string } = {};
  allowedModels: string[] | null = null;

  @Output() close = new EventEmitter<void>();

  public shareService = inject(ShareService);
  private recordHandlerService = inject(RecordHandlerService);
  private toastService = inject(ToastService);
  private solr = inject(SolrService);

  private dialogRef = inject(MatDialogRef<ShareDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  constructor() {
    this.document = this.data.document;
    this.queryParams = this.data.queryParams || {};

    // If sharing a selection (bb param present), restrict to page only
    if (this.queryParams['bb']) {
      this.allowedModels = ['page'];
    }

    // selectedPid will be set by the component, then we update URL
  }

  getCurrentShareUrl(selectedItem: DocumentHierarchyItem) {
    const url = this.shareService.getCurrentUrl(selectedItem.pid);

    if (Object.keys(this.queryParams).length > 0) {
      const urlObj = new URL(url);
      Object.keys(this.queryParams).forEach(key => {
        urlObj.searchParams.set(key, this.queryParams[key]);
      });
      return urlObj.toString();
    }

    return url;
  }

  onHierarchySelectionChanged(selectedItem: DocumentHierarchyItem): void {
    this.selectedPid = selectedItem.pid;
    this.selectedModel = selectedItem.model;
    this.currentShareUrl = this.getCurrentShareUrl(selectedItem);
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  copyToClipboard() {
    copyTextToClipboard(this.currentShareUrl);
    this.toastService.show('copy-to-clipboard-success');
  }

  share(site: 'facebook' | 'twitter' | 'linkedin') {
    if (!this.currentShareUrl) {
      return;
    }

    let baseUrl = '';
    if (site === 'facebook') {
      baseUrl = 'https://www.facebook.com/sharer/sharer.php?u=';
    } else if (site === 'twitter') {
      baseUrl = 'https://www.twitter.com/intent/tweet?url=';
    } else if (site === 'linkedin') {
      baseUrl = 'https://www.linkedin.com/sharing/share-offsite/?url=';
    } else {
      return;
    }

    const width = 500;
    const height = 500;
    window.open(
      baseUrl + encodeURIComponent(this.currentShareUrl),
      'sharer',
      'toolbar=0,status=0,width=' + width + ',height=' + height +
      ',top=' + (window.innerHeight - height) / 2 + ',left=' + (window.innerWidth - width) / 2
    );
  }

  shareIIIF() {
    let text = '';
    if (this.selectedModel === 'page') {
      text = this.solr.imageManifest(this.solr.getIiifBaseUrl(this.selectedPid));
    } else {
      text = this.solr.getIiifPresentationUrl(this.selectedPid);
    }

    copyTextToClipboard(text);
    this.toastService.show('copy-to-clipboard-success');
  }

}
