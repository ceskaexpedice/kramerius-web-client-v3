import {Component, EventEmitter, inject, Output} from '@angular/core';
import {TranslatePipe} from '@ngx-translate/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {ShareService} from '../../services/share.service';

@Component({
  selector: 'app-share-dialog',
	imports: [
		TranslatePipe,
	],
  templateUrl: './share-dialog.component.html',
  styleUrl: './share-dialog.component.scss'
})
export class ShareDialogComponent {

  @Output() close = new EventEmitter<void>();

  public shareService = inject(ShareService);

  private dialogRef = inject(MatDialogRef<ShareDialogComponent>, { optional: true });
  data = inject<any>(MAT_DIALOG_DATA);

  onClose() {
    this.close.emit();
    this.dialogRef?.close();
  }

  copyToClipboard() {

  }

}
