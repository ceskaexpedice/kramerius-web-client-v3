import { Component, inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-email-export-success-dialog',
  imports: [TranslatePipe],
  templateUrl: './email-export-success-dialog.component.html',
  styleUrls: ['../generic-dialog.scss', './email-export-success-dialog.component.scss'],
})
export class EmailExportSuccessDialogComponent {

  private dialogRef = inject(MatDialogRef<EmailExportSuccessDialogComponent>);

  onClose(): void {
    this.dialogRef.close();
  }
}
