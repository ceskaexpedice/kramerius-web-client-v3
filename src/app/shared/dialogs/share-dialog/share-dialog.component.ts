import { Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ShareService } from '../../services/share.service';
import { DocumentHierarchySelectorComponent, DocumentHierarchyItem } from '../../components/document-hierarchy-selector/document-hierarchy-selector.component';
import { RecordHandlerService } from '../../services/record-handler.service';
import { Metadata } from '../../models/metadata.model';
import { copyTextToClipboard } from '../../misc/misc-functions';
import { ToastService } from '../../services/toast.service';

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
  currentShareUrl: string = '';
  queryParams: { [key: string]: string } = {};
  allowedModels: string[] | null = null;

  @Output() close = new EventEmitter<void>();

  public shareService = inject(ShareService);
  private recordHandlerService = inject(RecordHandlerService);
  private toastService = inject(ToastService);

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
    let isPageSelected = false;

    if (selectedItem && selectedItem.model === 'page') {
      isPageSelected = true;
    }

    const url = this.shareService.getCurrentUrl(selectedItem.pid, isPageSelected);

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

}
