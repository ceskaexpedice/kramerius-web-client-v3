import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';

@Component({
  selector: 'app-close-confirmation-dialog',
  imports: [
    TranslatePipe,
  ],
  templateUrl: './close-confirmation-dialog.component.html',
  styleUrls: ['./close-confirmation-dialog.component.scss', '../../../generic-dialog.scss'],
})
export class CloseConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<CloseConfirmationDialogComponent>);
  data = inject<any>(MAT_DIALOG_DATA, { optional: true });

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    this.dialogRef.close(true);
  }
}
