import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShareService} from '../../services/share.service';
import {ButtonToggleComponent} from '../../components/button-toggle/button-toggle.component';
import {NgForOf} from '@angular/common';
import {RecordHandlerService} from '../../services/record-handler.service';
import {Metadata} from '../../models/metadata.model';
import {copyTextToClipboard} from '../../misc/misc-functions';

@Component({
  selector: 'app-share-dialog',
  imports: [
    TranslatePipe,
    ButtonToggleComponent,
    NgForOf,
  ],
  templateUrl: './share-dialog.component.html',
  styleUrl: './share-dialog.component.scss'
})
export class ShareDialogComponent {
  document!: Metadata;

  shareableDocumentTypes: any[] = [];
  activePid: string = '';

  currentShareUrl: string = '';

  @Output() close = new EventEmitter<void>();

  public shareService = inject(ShareService);
  private recordHandlerService = inject(RecordHandlerService);

  private dialogRef = inject(MatDialogRef<ShareDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  constructor() {
    this.document = this.data.document;
    this.loadShareableDocumentTypes();
  }

  loadShareableDocumentTypes(): void {
    this.shareableDocumentTypes = this.recordHandlerService.getShareableDocumentTypes(this.document);

    this.activePid = this.shareableDocumentTypes[0].pid;
    this.currentShareUrl = this.getCurrentShareUrl();
  }

  getCurrentShareUrl() {
    let isPageSelected = false;
    const documentType = this.shareableDocumentTypes.find(d => d.pid === this.activePid);

    if (documentType && documentType.model === 'page') {
      isPageSelected = true;
    }

    return this.shareService.getCurrentUrl(this.activePid, isPageSelected);
  }

  toggledActiveShareDocumentType(active: boolean, pid: string): void {
    if (active) {
      this.activePid = pid;
      this.currentShareUrl = this.getCurrentShareUrl();
    }
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  copyToClipboard() {
    copyTextToClipboard(this.currentShareUrl);
  }

}
