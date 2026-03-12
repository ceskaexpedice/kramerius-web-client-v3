import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MatCheckbox } from '@angular/material/checkbox';
import { FormsModule } from '@angular/forms';
import { DontShowAgainService, DontShowDialogs } from '../../services/dont-show-again.service';

@Component({
  selector: 'app-restricted-pages-info-dialog',
  imports: [
    TranslatePipe,
    MatCheckbox,
    FormsModule
  ],
  templateUrl: './restricted-pages-info-dialog.component.html',
  styleUrls: ['./restricted-pages-info-dialog.component.scss', '../generic-dialog.scss'],
})
export class RestrictedPagesInfoDialogComponent {
  private dialogRef = inject(MatDialogRef<RestrictedPagesInfoDialogComponent>, { optional: true });
  private dontShowAgainService = inject(DontShowAgainService);

  dontShowAgain = false;

  onClose() {
    if (this.dontShowAgain) {
      this.dontShowAgainService.setDontShowAgain(DontShowDialogs.RestrictedPagesInfoDialog);
    }
    this.dialogRef?.close();
  }
}
