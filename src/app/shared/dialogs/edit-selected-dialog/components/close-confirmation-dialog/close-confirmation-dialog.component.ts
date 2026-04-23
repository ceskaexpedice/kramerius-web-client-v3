import { Component, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { DontShowAgainService, DontShowDialogs } from '../../../../services/dont-show-again.service';

@Component({
  selector: 'app-close-confirmation-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule,
  ],
  templateUrl: './close-confirmation-dialog.component.html',
  styleUrls: ['./close-confirmation-dialog.component.scss', '../../../generic-dialog.scss'],
})
export class CloseConfirmationDialogComponent {
  private dialogRef = inject(MatDialogRef<CloseConfirmationDialogComponent>);
  private dontShowAgainService = inject(DontShowAgainService);
  data = inject<any>(MAT_DIALOG_DATA, { optional: true });

  dontShowAgain = false;

  onCancel() {
    this.dialogRef.close(false);
  }

  onConfirm() {
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.EditSelectedDialogCloseConfirmation);
    }
    this.dialogRef.close(true);
  }
}
