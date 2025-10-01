import {Component, inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {TranslatePipe} from '@ngx-translate/core';
import {MatCheckbox} from '@angular/material/checkbox';
import {DontShowAgainService, DontShowDialogs} from '../../../../services/dont-show-again.service';
import {FormsModule} from '@angular/forms';

export interface ActionConfirmationDialogData {
  title?: string;
  message?: string;
  confirmButtonLabel?: string;
  cancelButtonLabel?: string;
}

@Component({
  selector: 'app-action-confirmation-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './action-confirmation-dialog.component.html',
  styleUrls: ['./action-confirmation-dialog.component.scss', '../../../generic-dialog.scss'],
})
export class ActionConfirmationDialogComponent {
  dontShowAgain = false;

  private dialogRef = inject(MatDialogRef<ActionConfirmationDialogComponent>);
  data = inject<ActionConfirmationDialogData>(MAT_DIALOG_DATA, { optional: true });
  private dontShowAgainService = inject(DontShowAgainService);

  title = this.data?.title || 'action-confirmation-dialog--header';
  message = this.data?.message || 'action-confirmation-dialog--message';
  confirmButtonLabel = this.data?.confirmButtonLabel || 'yes-execute--button';
  cancelButtonLabel = this.data?.cancelButtonLabel || 'cancel';

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.EditSelectedDialogSubmitActionDialog);
    }

    this.dialogRef.close(true);
  }
}
