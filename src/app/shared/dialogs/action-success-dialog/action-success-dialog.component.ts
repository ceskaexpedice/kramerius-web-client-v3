import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { DontShowAgainService, DontShowDialogs } from '../../services/dont-show-again.service';

export type ActionDialogVariant = 'success' | 'error';

export interface ActionDialogData {
  variant: ActionDialogVariant;
}

@Component({
  selector: 'app-action-success-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule
  ],
  templateUrl: './action-success-dialog.component.html',
  styleUrls: ['./action-success-dialog.component.scss', '../generic-dialog.scss'],
})
export class ActionSuccessDialogComponent {
  private dialogRef = inject(MatDialogRef<ActionSuccessDialogComponent>, { optional: true });
  private dontShowAgainService = inject(DontShowAgainService);
  data: ActionDialogData = inject(MAT_DIALOG_DATA, { optional: true }) ?? { variant: 'success' };

  dontShowAgain = false;

  get isError(): boolean {
    return this.data.variant === 'error';
  }

  get dialogKey(): DontShowDialogs {
    return this.isError ? DontShowDialogs.ActionErrorDialog : DontShowDialogs.ActionSuccessDialog;
  }

  onClose() {
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(this.dialogKey);
    }
    this.dialogRef?.close();
  }
}
