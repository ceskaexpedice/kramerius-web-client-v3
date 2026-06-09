import { Component, EventEmitter, inject, Output } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { copyTextToClipboard } from '../../misc/misc-functions';
import { ToastService } from '../../services/toast.service';
import { InputComponent } from '../../components/input/input.component';

@Component({
  selector: 'app-folder-share-dialog',
  imports: [TranslatePipe, InputComponent],
  templateUrl: './folder-share-dialog.component.html',
  styleUrls: ['./folder-share-dialog.component.scss'],
})
export class FolderShareDialogComponent {
  shareUrl = '';
  folderName = '';

  @Output() close = new EventEmitter<void>();

  private toastService = inject(ToastService);
  private dialogRef = inject(MatDialogRef<FolderShareDialogComponent>, { optional: true });
  private data = inject<{ uuid: string; name: string }>(MAT_DIALOG_DATA);

  constructor() {
    this.shareUrl = `${window.location.origin}/folders/${this.data.uuid}`;
    this.folderName = this.data.name;
  }

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  copyToClipboard() {
    copyTextToClipboard(this.shareUrl);
    this.toastService.show('copy-to-clipboard-success');
  }
}
